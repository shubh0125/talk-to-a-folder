import re
from langchain_text_splitters import RecursiveCharacterTextSplitter
from models import FileInfo


def chunk_text(text: str, file: FileInfo) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " "]
    )

    chunks = splitter.split_text(text)
    result = []

    for i, chunk in enumerate(chunks):
        if not chunk.strip():
            continue

        # Try to extract page number from PDF page markers
        page = None
        match = re.search(r'\[Page (\d+)\]', chunk)
        if match:
            page = int(match.group(1))

        result.append({
            "text": chunk,
            "filename": file.name,
            "file_id": file.file_id,
            "mime_type": file.mime_type,
            "chunk_index": i,
            "page": page
        })

    return result
