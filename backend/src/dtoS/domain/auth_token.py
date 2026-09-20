from dataclasses import dataclass

@dataclass(frozen=True,slots=True)
class TokenPayloadDTO:
    user_id: int 
    username: str