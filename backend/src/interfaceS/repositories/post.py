import abc
from typing import Any


from src.dtoS.domain.post import CreatePostDTO,UpdatePostDTO
from src.dtoS.record.post import PostFeedRecordDTO,PostRecordDTO


class IPostRepository(abc.ABC,):

    @abc.abstractmethod
    async def add(self,session:Any,user_id:int,create_item:CreatePostDTO)->PostRecordDTO:
        ...

    @abc.abstractmethod
    async def get_by_slug_or_none(self,session:Any,slug:str)->PostRecordDTO|None:
        ...
    
    @abc.abstractmethod
    async def get_by_slug(self,session:Any,slug:str)->PostRecordDTO:
        ...
    
    @abc.abstractmethod
    async def delete_by_slug(self,session:Any,slug:str)->None:
        ...
    
    @abc.abstractmethod
    async def update_by_slug(self,session:Any,slug:str,update_item:UpdatePostDTO)->PostRecordDTO:
        ...
    
    @abc.abstractmethod
    async def list_by_followings(self,session:Any,user_id:int,limit:int,offset:int)->list[PostFeedRecordDTO]:
        ...


    @abc.abstractmethod
    async def count_by_followings(self,session:Any,user_id:int)->int:
        ...

    @abc.abstractmethod
    async def  count_by_filters(self,session:Any,tag:str|None=None,user:str|None=None,favorited:str|None=None)->int:
        ...