from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    openai_api_key: str
    pinecone_api_key: str
    pinecone_index_name: str
    google_client_id: str
    google_client_secret: str
    jwt_secret: str
    frontend_url: str

    class Config:
        env_file = ".env"


settings = Settings()
