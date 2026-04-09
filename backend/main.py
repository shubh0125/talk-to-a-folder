import asyncio
import json
import logging
import logging.config

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import (
    GoogleAuthRequest, AuthResponse, FolderLoadRequest,
    FolderStatusResponse, ChatRequest, ChatResponse,
)
from auth import (
    verify_google_token, create_jwt, get_current_user,
    store_access_token, revoke_access_token,
)
from drive_service import extract_folder_id, get_drive_service, list_files_in_folder, download_file
from extractor import extract_text
from chunker import chunk_text
from embedder import embed_chunks
from vector_store import (
    upsert_chunks, delete_user_namespace, get_user_chunk_count,
    save_user_meta, get_user_meta, delete_user_meta,
)
from rag_pipeline import run_rag_query
from rate_limiter import chat_limiter, folder_limiter
from config import settings

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Talk-to-a-Folder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache: google_sub → list[FileInfo]
# Pinecone is the source of truth for vectors; this is just for the file list UI.
folder_cache: dict = {}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@app.post("/auth/google", response_model=AuthResponse, tags=["Auth"])
async def auth_google(body: GoogleAuthRequest):
    """Exchange a Google access token for a short-lived app JWT."""
    user_info = await verify_google_token(body.access_token)
    google_sub = user_info["sub"]

    # Store the Google access token server-side — it never goes into the JWT
    store_access_token(google_sub, body.access_token)

    token = create_jwt(
        google_sub=google_sub,
        email=user_info["email"],
        name=user_info.get("name", ""),
        picture=user_info.get("picture", ""),
    )

    logger.info("User authenticated: %s", user_info["email"])
    return AuthResponse(
        jwt=token,
        email=user_info["email"],
        name=user_info.get("name", ""),
        picture=user_info.get("picture"),
    )


@app.post("/auth/logout", tags=["Auth"])
def logout(user: dict = Depends(get_current_user)):
    """Revoke the server-side token and clear the user's rate limit history."""
    google_sub = user["sub"]
    revoke_access_token(google_sub)
    chat_limiter.reset(google_sub)
    folder_limiter.reset(google_sub)
    logger.info("User logged out: %s", user.get("email"))
    return {"message": "Logged out successfully."}


# ---------------------------------------------------------------------------
# Folder
# ---------------------------------------------------------------------------

@app.post("/folder/load", tags=["Folder"])
async def load_folder(
    request: Request,
    body: FolderLoadRequest,
    user: dict = Depends(get_current_user),
):
    """
    Stream folder ingestion progress via Server-Sent Events.
    Downloads, extracts, chunks, embeds, and stores all documents.
    """
    google_sub = user["sub"]
    access_token = user["google_access_token"]

    # Rate-limit folder loads — embedding is expensive
    folder_limiter.check(google_sub)

    async def event_stream():
        try:
            yield _sse("step:connecting")
            await asyncio.sleep(0)
            folder_id = extract_folder_id(body.folder_url)
            service = get_drive_service(access_token)

            yield _sse("step:reading")
            await asyncio.sleep(0)
            files = list_files_in_folder(service, folder_id)

            if not files:
                yield _sse("No supported files were found in this folder.", event="error")
                return

            yield _sse(f"step:extracting:{len(files)}")
            await asyncio.sleep(0)
            delete_user_namespace(google_sub)

            all_chunks = []
            for i, file in enumerate(files):
                yield _sse(f"step:extracting:{len(files)}:{i + 1}")
                await asyncio.sleep(0)
                try:
                    content = download_file(service, file)
                    text = extract_text(file, content)
                    if not text.strip():
                        logger.warning("No text extracted from %s", file.name)
                        continue
                    chunks = chunk_text(text, file)
                    all_chunks.extend(chunks)
                except Exception:
                    logger.exception("Failed to process file: %s", file.name)
                    continue

            if not all_chunks:
                yield _sse(
                    "Could not extract text from any file. "
                    "Make sure the documents contain selectable text (not scanned images).",
                    event="error",
                )
                return

            yield _sse("step:analyzing")
            await asyncio.sleep(0)
            all_chunks = embed_chunks(all_chunks)

            yield _sse("step:saving")
            await asyncio.sleep(0)
            upsert_chunks(all_chunks, google_sub)

            # Persist folder URL and email to Pinecone so user is auto-restored
            # on next login from any device
            save_user_meta(google_sub, user.get("email", ""), body.folder_url)

            folder_cache[google_sub] = files
            logger.info(
                "Folder loaded for user %s: %d files, %d chunks",
                google_sub, len(files), len(all_chunks),
            )

            files_data = [
                {"file_id": f.file_id, "name": f.name, "mime_type": f.mime_type}
                for f in files
            ]
            yield _sse(json.dumps({
                "files": files_data,
                "chunk_count": len(all_chunks),
                "folder_url": body.folder_url
            }), event="done")

        except HTTPException as e:
            logger.warning("HTTPException during folder load: %s", e.detail)
            yield _sse(e.detail, event="error")
        except Exception:
            logger.exception("Unexpected error during folder load for user %s", google_sub)
            yield _sse("An unexpected error occurred. Please try again.", event="error")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(data: str, event: str = "progress") -> str:
    return f"event: {event}\ndata: {data}\n\n"


@app.get("/folder/status", response_model=FolderStatusResponse, tags=["Folder"])
def folder_status(user: dict = Depends(get_current_user)):
    """Return the current folder load status for the authenticated user.
    Also returns the saved folder URL so the frontend can restore state
    on any device without prompting the user to re-enter the URL."""
    google_sub = user["sub"]
    files = folder_cache.get(google_sub, [])
    chunk_count = get_user_chunk_count(google_sub)

    folder_url = None
    if chunk_count > 0:
        meta = get_user_meta(google_sub)
        if meta:
            folder_url = meta.get("folder_url")

    return FolderStatusResponse(
        loaded=chunk_count > 0,
        files=files,
        chunk_count=chunk_count,
        folder_url=folder_url,
    )


@app.delete("/folder/clear", tags=["Folder"])
def clear_folder(user: dict = Depends(get_current_user)):
    """Delete all vectors and saved metadata for the user's current folder."""
    google_sub = user["sub"]
    delete_user_namespace(google_sub)
    delete_user_meta(google_sub)
    folder_cache.pop(google_sub, None)
    logger.info("Folder cleared for user %s", google_sub)
    return {"message": "Folder cleared successfully."}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(body: ChatRequest, user: dict = Depends(get_current_user)):
    """Answer a question using RAG over the user's loaded folder."""
    google_sub = user["sub"]

    # Per-user rate limit
    chat_limiter.check(google_sub)

    chunk_count = get_user_chunk_count(google_sub)
    if chunk_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No folder loaded. Please load a Google Drive folder first.",
        )

    logger.info("Chat query from user %s: %s", google_sub, body.question[:80])
    result = await run_rag_query(body.question, google_sub)
    return ChatResponse(answer=result["answer"], citations=result["citations"])
