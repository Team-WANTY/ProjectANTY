
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    BLOB_CONNECTION_STRING: str


settings = Settings()  # ty :ignore
