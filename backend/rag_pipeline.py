from anthropic import Anthropic
from embedder import embed_query
from vector_store import query_chunks
from models import Citation
from config import settings

client = Anthropic(api_key=settings.anthropic_api_key)


def build_context(chunks: list[dict]) -> tuple[str, dict]:
    """Build numbered context string and return source map: (filename, page) -> index."""
    source_map = {}
    for chunk in chunks:
        key = (chunk["filename"], chunk.get("page") or 0)
        if key not in source_map:
            source_map[key] = len(source_map) + 1

    context_parts = []
    for chunk in chunks:
        key = (chunk["filename"], chunk.get("page") or 0)
        idx = source_map[key]
        page_info = f", page {chunk['page']}" if chunk.get("page") else ""
        header = f"[{idx}] {chunk['filename']}{page_info}"
        context_parts.append(f"{header}:\n{chunk['text']}")

    return "\n\n---\n\n".join(context_parts), source_map


def extract_citations(chunks: list[dict], source_map: dict) -> list[Citation]:
    if not chunks:
        return []

    # Only cite chunks within 0.15 of the top score
    top_score = max(c.get("score", 0) for c in chunks)
    threshold = top_score - 0.15

    seen = set()
    citations = []
    for chunk in chunks:
        if chunk.get("score", 0) < threshold:
            continue
        key = (chunk["filename"], chunk.get("page") or 0)
        if key not in seen:
            seen.add(key)
            citations.append(Citation(
                index=source_map.get(key, 0),
                filename=chunk["filename"],
                page=chunk.get("page"),
                file_id=chunk["file_id"]
            ))

    citations.sort(key=lambda c: c.index)
    return citations


async def run_rag_query(question: str, google_sub: str) -> dict:
    # Step 1: Embed the question
    query_embedding = embed_query(question)

    # Step 2: Retrieve relevant chunks
    chunks = query_chunks(query_embedding, google_sub, top_k=5)

    if not chunks:
        return {
            "answer": "I couldn't find relevant information in the loaded folder to answer your question.",
            "citations": []
        }

    # Step 3: Build numbered context
    context, source_map = build_context(chunks)

    # Step 4: Call Claude
    system_prompt = """You are a document assistant. Your job is to answer questions based strictly on the provided context from the user's files.

Rules:
- Only use information explicitly present in the context
- After each sentence or fact that comes from a source, add the source number in brackets like [1] or [2]
- Source numbers correspond to the [N] prefixes shown in the context headers
- If the answer is not in the context, say: "I couldn't find information about that in the loaded files."
- Do not hallucinate or infer beyond what is written

Formatting:
- Always respond using Markdown
- Use **bold** for key terms or important values
- Use bullet points or numbered lists when presenting multiple items
- Use headings (## or ###) when the answer has distinct sections
- Use tables for comparisons or structured data
- Use `code` formatting for technical terms, file names, or exact values
- Keep responses concise and well-structured"""

    user_message = f"""Context from files:
{context}

Question: {question}"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    answer = response.content[0].text
    citations = extract_citations(chunks, source_map)

    return {
        "answer": answer,
        "citations": citations
    }
