from anthropic import Anthropic
from embedder import embed_query
from vector_store import query_chunks
from models import Citation
from config import settings

client = Anthropic(api_key=settings.anthropic_api_key)


def build_context(chunks: list[dict]) -> str:
    context_parts = []
    for chunk in chunks:
        page_info = f", page {chunk['page']}" if chunk.get("page") else ""
        header = f"[{chunk['filename']}{page_info}]"
        context_parts.append(f"{header}:\n{chunk['text']}")
    return "\n\n---\n\n".join(context_parts)


def extract_citations(chunks: list[dict]) -> list[Citation]:
    seen = set()
    citations = []
    for chunk in chunks:
        key = (chunk["filename"], chunk.get("page"))
        if key not in seen:
            seen.add(key)
            citations.append(Citation(
                filename=chunk["filename"],
                page=chunk.get("page"),
                file_id=chunk["file_id"]
            ))
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

    # Step 3: Build context
    context = build_context(chunks)

    # Step 4: Call Claude
    system_prompt = """You are a document assistant. Your job is to answer questions based strictly on the provided context from the user's files.

Rules:
- Only use information explicitly present in the context
- Do NOT include filename citations or source references inside your answer text — sources are shown separately to the user
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
    citations = extract_citations(chunks)

    return {
        "answer": answer,
        "citations": citations
    }
