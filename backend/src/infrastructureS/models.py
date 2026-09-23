from datetime import datetime
from functools import partial

from sqlalchemy.sql.schema import ForeignKey
from sqlalchemy.orm.decl_api import DeclarativeBase 
from sqlalchemy.orm.base import Mapped
from sqlalchemy.orm import mapped_column,relationship

class Base(DeclarativeBase):
    ...


relationship = partial(relationship,lazy="raise")


class User(Base):
    __tablename__= "users"
    id: Mapped[int] = mapped_column(primary_key=True,autoincrement=True)
    username: Mapped[int] = mapped_column(unique=True)
    email: Mapped[int] = mapped_column(unique=True)
    password_has:Mapped[int]
    bio:Mapped[str]
    image:Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[datetime]
    updated_at:Mapped[datetime] = mapped_column(nullable=True)


class Follower(Base):
    __tablename__ = "followers"

    # "follower" is a user who follows a user.
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    # "following" is a user who you follow.
    following_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime]



class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    slug: Mapped[str] = mapped_column(nullable=False, unique=True)
    title: Mapped[str]
    description: Mapped[str]
    body: Mapped[str]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime] = mapped_column(nullable=True)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tag: Mapped[str] = mapped_column(nullable=False, unique=True)
    created_at: Mapped[datetime]


class PostTag(Base):
    __tablename__ = "post_tags"

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)
    created_at: Mapped[datetime]


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime]


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    body: Mapped[str]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime] = mapped_column(nullable=True)
