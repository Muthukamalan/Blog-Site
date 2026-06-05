from app.config import settings
from app.models import User
from app.schemas import UserCreate,UserPrivate,UserPublic,UserUpdate,ResetPasswordRequest,ChangePasswordRequest,ForgotPasswordRequest
from app.auth import create_access_token,generate_reset_token,get_current_user,hash_password,hash_reset_token,verify_access_token, verify_password
from app.utilities import delete_profile_image,process_profile_image,upload_profile_image,send_password_reset_email

from starlette.concurrency import run_in_threadpool
from typing import Annotated, Literal
from fastapi import Query
from sqlalchemy import func, select

from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession


class UserRepository:
    def __init__(self, db:AsyncSession ) -> None:
        self.db: AsyncSession = db

    async def get_user(self,user:User):
        result = await self.db.execute(
            select(User).where(
                func.lower(User.username)==user.username.lower()
            )
        )
        result.scalars().first()

    async def create_user(self,user:UserCreate)->tuple[User,Literal[0,-1]]:
        result = await self.db.execute(
            select(User).where(
                func.lower(User.username)==user.username.lower()
            )
        )
        existing_user = result.scalars().first()

        result = await self.db.execute(func.lower(User.email)==user.email.lower())

        existing_mail = result.scalars().first()


        if existing_user:
            return (existing_user,-1)
        elif existing_user:
            return (existing_user,-2)
        new_user = User(
            username = user.username,
            email = user.email,
            password_hash = hash_password(user.password)  
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return (new_user,0)
    

    async def get_user_posts(self,user:User,skip,limit):
        pass 

    async def update_user(self,user:UserUpdate):
        pass 

    async def delete_user(self,user):
        pass 


    async def upload_profile_picture(self,user_id):
        pass 

    async def delete_user_picture(self,user_id,current_user):
        pass 