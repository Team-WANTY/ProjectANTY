from pydantic import BaseModel

class PaginatedIDList(BaseModel):
    ids:list[str]
    continuation_token:str|None