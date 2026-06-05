from app.config import settings
from app.models import Post
from app.schemas import PostUpdate
from typing import Annotated
from fastapi import Query
from sqlalchemy import func, select

from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession


class PostRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db: AsyncSession = db

    async def get_posts(
        self,
        skip: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
    ) -> list[Post]:
        result = await self.db.execute(
            select(Post)
            .options(selectinload(Post.author))
            .order_by(Post.date_posted.desc())
            .offset(skip)
            .limit(limit)
        )
        posts = result.scalars().all()
        return posts

    async def count_posts(self) -> int:
        count_result = await self.db.execute(select(func.count()).select_from(Post))
        total = count_result.scalar() or 0
        return total

    async def create_post(
        self, title, content, user_id, attribute_names: list = ["author"]
    ) -> Post:
        post = Post(title=title, content=content, user_id=user_id)
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post, attribute_names=attribute_names)
        return post

    async def get_post_by_id(self, post_id: int) -> Post:
        result = await self.db.execute(
            select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
        )
        return result.scalars().first()

    async def commit_refresh_post(self, post: PostUpdate, attribute_names: list):
        await self.db.commit()
        await self.db.refresh(post, attribute_names=attribute_names)
        return post

    async def delete_post(self, post: Post):
        await self.db.delete(post)
        await self.db.commit()
