import abc
from typing import Any


class IFavoriteRepository(abc.ABC):
    
    @abc.abstractmethod
    async def exists(self,session:Any,user_id:int,post_id:int)->bool:
        ...

    @abc.abstractmethod
    async def count(self,session:Any,post_id:int)->int:
        ...

    @abc.abstractmethod
    async def create(self,session:Any,post_id:int,user_id:int)->None:
        ...

    @abc.abstractmethod
    async def delete(self,session:Any,post_id:int,user_id:int)->None:
        ...