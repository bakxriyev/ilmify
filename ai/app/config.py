from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Ilmify AI"
    app_port: int = 8000
    debug: bool = False

    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "ilmify"
    db_user: str = "postgres"
    db_password: str = "kamron123"
    db_min_connections: int = 2
    db_max_connections: int = 10

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_cache_ttl: int = 300

    jwt_secret: str = "kamron123"
    jwt_algorithm: str = "HS256"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:8b"
    ollama_timeout: int = 60

    cors_origins: str = "http://localhost:3000,http://localhost:4000"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    class Config:
        env_file = ".env"
        env_prefix = "AI_"


settings = Settings()
