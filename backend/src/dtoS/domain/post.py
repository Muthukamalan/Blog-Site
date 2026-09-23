import datetime
from dataclasses import dataclass

from src.dtoS.record.post import PostFeedRecordDTO,PostRecordDTO

@dataclass(frozen=True,slots=True)
class PostuserDTO:
    username: str 
    bio:str = ""
    image: str | None = None 
    following: bool = False

@dataclass(frozen=True,slots=True)
class PostDTO:
    id: int 
    user_id: int 
    slug: str 
    title: str
    description: str  
    body: str 
    tags: list[str]
    user:PostuserDTO
    favorited: bool  
    favorites_count: int 
    created_at:datetime.datetime
    updated_at: datetime.datetime

    @classmethod
    def with_updated_fields(cls,dto:"PostDTO",updated_fields:dict)->"PostDTO":
        return cls(dto,**updated_fields)
    

    @classmethod
    def from_record(cls,record:PostRecordDTO,user:PostuserDTO,tags:list[str],favorited:bool,favorites_count:int)->"PostDTO":
        return cls(
            id=record.id,
            user=record.user_id,
            slug=record.slug,
            title = record.title,
            description = record.description,
            body = record.body,
            tags = tags,
            user = user,
            favorited = favorited ,
            favorites_count = favorites_count,
        )
    
    @classmethod
    def from_feed_record(cls,record:PostFeedRecordDTO)->"PostDTO":
        return cls(
            id=record.id,
            user=record.user_id,
            slug=record.slug,
            title =record.title,
            description =record.description,
            body =record.body,
            tags =record.tags,
            user =PostuserDTO(
                username=record.user_username,
                bio=record.user_bio,
                image=record.user_image,
                following=record.user_following
            ),
            favorited = record.favorited,
            favorites_count = record.favorites_count,
            created_at=record.created_at,
            updated_at=record.updated_at
        )
    

@dataclass(frozen=True,slots=True)
class PostFeedDTO:
    posts: list[PostDTO]
    posts_count: int 
    

@dataclass(frozen=True,slots=True)
class CreatePostDTO:
    title:str
    description: str 
    body: str 
    tags: list[str ]
    
@dataclass(frozen=True,slots=True)
class UpdatePostDTO:
    title: str | None
    description: str | None
    body: str | None