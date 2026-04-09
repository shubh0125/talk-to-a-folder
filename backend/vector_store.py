import uuid
import logging
from pinecone import Pinecone, ServerlessSpec
from config import settings

logger = logging.getLogger(__name__)

pc = Pinecone(api_key=settings.pinecone_api_key)

# Separate namespace for user metadata (folder URL, email)
# Uses a fixed dummy vector — we only ever fetch by ID, never query semantically
# Pinecone requires at least one non-zero value, so we set index 0 to 1.0
USER_META_NAMESPACE = "_user_meta"
USER_META_VECTOR = [1.0] + [0.0] * 1535


def get_index():
    existing = [i.name for i in pc.list_indexes()]
    if settings.pinecone_index_name not in existing:
        pc.create_index(
            name=settings.pinecone_index_name,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
    return pc.Index(settings.pinecone_index_name)


# ---------------------------------------------------------------------------
# User metadata — persists folder URL across devices and sessions
# ---------------------------------------------------------------------------

def save_user_meta(google_sub: str, email: str, folder_url: str) -> None:
    """Upsert a metadata record for the user so they don't need to re-enter
    their folder URL when logging in from any device."""
    try:
        index = get_index()
        index.upsert(
            vectors=[{
                "id": f"meta_{google_sub}",
                "values": USER_META_VECTOR,
                "metadata": {
                    "email": email,
                    "folder_url": folder_url,
                }
            }],
            namespace=USER_META_NAMESPACE
        )
        logger.info("Saved user meta for %s", google_sub)
    except Exception:
        logger.exception("Failed to save user meta for %s", google_sub)


def get_user_meta(google_sub: str) -> dict | None:
    """Fetch saved metadata (folder URL, email) for a user."""
    try:
        index = get_index()
        result = index.fetch(
            ids=[f"meta_{google_sub}"],
            namespace=USER_META_NAMESPACE
        )
        # Pinecone SDK returns an object — use attribute access, not dict.get()
        vectors = getattr(result, "vectors", None) or {}
        record = vectors.get(f"meta_{google_sub}")
        if record:
            metadata = getattr(record, "metadata", None) or {}
            return metadata
        return None
    except Exception:
        logger.exception("Failed to fetch user meta for %s", google_sub)
        return None


def delete_user_meta(google_sub: str) -> None:
    try:
        index = get_index()
        index.delete(ids=[f"meta_{google_sub}"], namespace=USER_META_NAMESPACE)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Document chunks
# ---------------------------------------------------------------------------

def upsert_chunks(chunks: list[dict], google_sub: str):
    index = get_index()
    namespace = f"user_{google_sub}"

    vectors = []
    for chunk in chunks:
        vector_id = str(uuid.uuid4())
        vectors.append({
            "id": vector_id,
            "values": chunk["embedding"],
            "metadata": {
                "text": chunk["text"],
                "filename": chunk["filename"],
                "file_id": chunk["file_id"],
                "chunk_index": chunk["chunk_index"],
                "page": chunk.get("page") or 0
            }
        })

    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        index.upsert(vectors=vectors[i:i + batch_size], namespace=namespace)


def query_chunks(query_embedding: list[float], google_sub: str, top_k: int = 5) -> list[dict]:
    index = get_index()
    namespace = f"user_{google_sub}"

    result = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True
    )

    return [
        {
            "text": match.metadata["text"],
            "filename": match.metadata["filename"],
            "file_id": match.metadata["file_id"],
            "page": match.metadata.get("page"),
            "score": match.score
        }
        for match in result.matches
    ]


def delete_user_namespace(google_sub: str):
    try:
        index = get_index()
        namespace = f"user_{google_sub}"
        index.delete(delete_all=True, namespace=namespace)
    except Exception:
        pass


def get_user_chunk_count(google_sub: str) -> int:
    try:
        index = get_index()
        stats = index.describe_index_stats()
        namespace = f"user_{google_sub}"
        ns_stats = stats.namespaces.get(namespace)
        return ns_stats.vector_count if ns_stats else 0
    except Exception:
        return 0
