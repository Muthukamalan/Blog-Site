import abc
from typing import Any



class IFollowerRepository(abc.ABC):

    @abc.abstractmethod
    async def exists(self,session:Any,follower_id:int,following_id:int)->bool:
        ...

    @abc.abstractmethod
    async def list(self,session:Any,follower_id:int,following_ids:int)->list[int]:
        ...

    @abc.abstractmethod
    async def create(self,session:Any,follower_id:int,following_id:int)->None:
        ...

    @abc.abstractmethod
    async def delete(self,session:Any,follower_id:int,following_id:int)->None:
        ...



















































