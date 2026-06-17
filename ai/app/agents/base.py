from langchain_ollama import ChatOllama
from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings


def get_llm(temperature: float = 0.1) -> BaseChatModel:
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=temperature,
        num_predict=2048,
        timeout=30,
    )


def get_llm_creative(temperature: float = 0.3) -> BaseChatModel:
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=temperature,
        num_predict=1024,
        timeout=20,
    )
