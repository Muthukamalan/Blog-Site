from typing import Annotated,Literal

from fastapi import (
    APIRouter,
    Depends,
    status,
    HTTPException,
    BackgroundTasks,
    Query,
    UploadFile,
)
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    PaginatedPostsResponse,
    Token,
    UserPrivate,
    UserPublic,
    UserCreate,
)
from app.models import User
from app.schemas import ForgotPasswordRequest,ResetPasswordRequest
from app.auth.authentication import CurrentUser
from app.reposits.users import UserRepository


service: Annotated[AsyncSession, Depends(get_db)]

router = APIRouter()


async def get_user_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserRepository:
    return UserRepository(db=db)

@router.post("",response_model=UserPrivate,status_code=status.HTTP_201_CREATED)
def create_user(user:UserCreate,service:UserRepository=Depends(get_user_service))->User:
    result:User
    existing_user:Literal[0,-1]
    result,existing_user = service.create_user(user=user)
    if existing_user!=0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Username or email already exists!")
    return result
    


@router.post("/token", response_model=Token)
def login_for_access_token(form_data:Annotated[OAuth2PasswordRequestForm,Depends()],service:UserRepository)


@router.get("/me", response_model=UserPrivate)
def get_current_user(current_user:CurrentUser):
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forget_password(request_data:)

@router.post("/reset-password", status_code=status.HTTP_200_OK)
@router.patch("/me/password", status_code=status.HTTP_200_OK)
@router.get("/{user_id}", response_model=UserPublic)
@router.get("/{user_id}/posts", response_model=PaginatedPostsResponse)
@router.patch("/{user_id}", response_model=UserPrivate)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.patch("/{user_id}/picture", response_model=UserPrivate)
@router.delete("/{user_id}/picture", response_model=UserPrivate)
def _():
    pass
