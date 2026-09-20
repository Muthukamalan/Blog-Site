import datetime
from dataclasses import dataclass

from src.dtoS.record.post import PostFeedRecordDTO,PostRecordDTO

@dataclass(frozen=True,slots=True)
class PostAuthorDTO:
    username: str 
    bio:str = ""
    image: str | None = None 
    following: bool = False

@dataclass(frozen=True,slots=True)
class PostDTO:
    id: int 
    author_id: int 
    slug: str 
    title: str
    description: str  
    body: str 
    tags: list[str]
    author:PostAuthorDTO
    favorited: bool  
    favorites_count: int 
    created_at:datetime.datetime
    updated_at: datetime.datetime

    @classmethod
    def with_updated_fields(cls,dto:"PostDTO",updated_fields:dict)->"PostDTO":
        return cls(dto,**updated_fields)
    

    @classmethod
    def from_record(cls,record:PostRecordDTO,author:PostAuthorDTO,tags:list[str],favorited:bool,favorites_count:int)->"PostDTO":
        return cls(
            id=record.id,
            author=record.author_id,
            slug=record.slug,
            title = record.title,
            description = record.description,
            body = record.body,
            tags = tags,
            author = author,
            favorited = favorited ,
            favorites_count = favorites_count,
        )
    
    @classmethod
    def from_feed_record(cls,record:PostFeedRecordDTO)->"PostDTO":
        return cls(
            id=record.id,
            author=record.author_id,
            slug=record.slug,
            title =record.title,
            description =record.description,
            body =record.body,
            tags =record.tags,
            author =PostAuthorDTO(
                username=record.author_username,
                bio=record.author_bio,
                image=record.author_image,
                following=record.author_following
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