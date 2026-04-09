from openai import OpenAI
from config import settings

client = OpenAI(api_key=settings.openai_api_key)


def embed_chunks(chunks: list[dict]) -> list[dict]:
    texts = [c["text"] for c in chunks]

    # Batch embed — one API call for all chunks
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )

    for i, embedding_obj in enumerate(response.data):
        chunks[i]["embedding"] = embedding_obj.embedding

    return chunks


def embed_query(query: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[query]
    )
    return response.data[0].embedding
