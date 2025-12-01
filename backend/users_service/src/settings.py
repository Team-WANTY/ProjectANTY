from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    PROFILES_SERVICE_URL: str


settings = Settings()  # ty :ignore
