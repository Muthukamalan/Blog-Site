import abc
from  typing import Any 

from src.dtoS.domain.comment import CreateCommentDTO
from src.dtoS.record.comment import CommentRecordDTO


class ICommentRepository(abc.ABC):
    
    @abc.abstractmethod
    async def add(self,session:Any,user_id:int,post_id:int,create_item:CreateCommentDTO):
        ...

    @abc.abstractmethod
    async def get(self,session:Any,comment_id:int)->CommentRecordDTO:
        ...
    
    @abc.abstractmethod
    async def list(self,session:Any,post_id)->list[CommentRecordDTO]:
        ...
    
    @abc.abstractmethod
    async def delete(self,session:Any,comment_id:int)->None:
        ...
    
    @abc.abstractmethod
    async def count(self,session:Any,user_id:int)->int:
        ...