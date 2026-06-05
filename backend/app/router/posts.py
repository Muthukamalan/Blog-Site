from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser
from app.config import settings
from app.database import get_db
from app.models import Post
from app.schemas import PaginatedPostsResponse, PostCreate, PostResponse, PostUpdate
from app.reposits.posts import PostRepository


router = APIRouter()


async def get_post_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PostRepository:
    return PostRepository(db=db)


@router.get("", response_model=PaginatedPostsResponse)
def get_posts(
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
    service: PostRepository = Depends(get_post_service),
):
    total = service.count_posts()
    posts = service.get_posts(skip=skip, limit=limit)
    has_more = skip + len(posts) < total
    return PaginatedPostsResponse(
        posts=[PostResponse.model_validate(post) for post in posts],
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    )


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post: PostCreate,
    current_user: CurrentUser,
    service: PostRepository = Depends(get_post_service),
):
    return service.create_post(
        title=post.title, content=post.content, user_id=current_user.id
    )


@router.get("/{post_id}", response_model=PostResponse, status_code=status.HTTP_200_OK)
def get_post(post_id: int, service: PostRepository = Depends(get_post_service)):
    post = service.get_post_by_id(post_id=post_id)
    if post:
        return post
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")


@router.put(
    "/{post_id}", response_model=PostResponse, status_code=status.HTTP_202_ACCEPTED
)
def update_post_full(
    post_id: int,
    post_data: PostUpdate,
    current_user: CurrentUser,
    service: PostRepository = Depends(get_post_service),
):
    post: Post = service.get_post_by_id(post_id=post_id)
    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    post.title = post_data.title
    post.content = post_data.content

    return service.commit_refresh_post(post=post, attribute_names=["author"])


@router.patch("/{post_id}", response_model=PostResponse)
def update_post_partial(
    post_id: int,
    post_data: PostUpdate,
    current_user: CurrentUser,
    service: PostRepository = Depends(get_post_service),
):
    post = service.get_post_by_id(post_id=post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )
    update_data = post_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    update_post = post.model_dump(exclude_unset=True)
    for field, value in update_post.items():
        setattr(post, field, value)

    return service.commit_refresh_post(
        post_id=post_id,
        post_data=post_data,
        current_user=current_user,
    )


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_post(
    post_id: int,
    current_user: CurrentUser,
    service: PostRepository = Depends(get_post_service),
):
    post: Post = service.get_post_by_id(post_id=post_id)

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    service.delete_post(post=post)
