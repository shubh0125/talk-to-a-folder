# Talk to a Folder — Product Document

## Overview

**Talk to a Folder** is an AI-powered document assistant that lets users chat with any Google Drive folder in natural language. Users connect their Google account, paste a folder link, and immediately get a conversational interface that can answer questions about the documents inside — with every answer citing its source.

The core use case is knowledge retrieval from unstructured documents. Instead of manually searching through PDFs, reports, or slide decks, users ask questions in plain English and get precise, sourced answers in seconds.

---

## Key Features

### 1. Google Drive Integration
- Sign in with Google via OAuth 2.0 (popup-based, no redirect)
- Read-only access to Drive — the app cannot create, modify, or delete files
- Supports all major document formats stored in Drive

### 2. Multi-Format Document Support

| Format | How it's processed |
|---|---|
| Google Docs | Exported as plain text via Drive API |
| Google Sheets | Exported as CSV via Drive API |
| Google Slides | Exported as plain text via Drive API |
| PDF | Text extracted per page using PyMuPDF, with page numbers preserved |
| Word (DOCX) | Paragraph text extracted using python-docx |
| PowerPoint (PPTX) | Slide text extracted using python-pptx |
| Plain text (TXT) | Read directly |

Limits: up to **30 files** per folder, up to **10 MB** per file.

### 3. RAG Pipeline (Retrieval-Augmented Generation)
The app uses a full RAG pipeline to answer questions:

```
Question
   ↓
Embed question (OpenAI text-embedding-3-small)
   ↓
Semantic search in Pinecone (top 5 most relevant chunks)
   ↓
Build context from retrieved chunks
   ↓
Claude generates a grounded, Markdown-formatted answer
   ↓
Answer + source citations returned to user
```

Answers are always grounded in actual document content — the AI cannot hallucinate information that isn't in the folder.

### 4. Markdown-Rendered AI Responses
Assistant responses are fully rendered as Markdown, supporting:
- Bold, italic, and inline code
- Bullet and numbered lists
- Headings and sections
- Tables for comparisons or structured data
- Code blocks with syntax highlighting
- Blockquotes

### 5. Source Citations
Every assistant response includes citation pills displayed below the message, showing the filename and page number. Each pill is a direct link that opens the exact source file in Google Drive. The AI never fabricates citations — they are derived from the actual chunks retrieved from Pinecone.

### 6. Real-Time Progress Streaming
Folder ingestion uses Server-Sent Events (SSE) to stream live progress to the browser:
- Visual step-by-step progress: Connecting → Reading → Extracting → Analyzing → Ready
- Per-file progress bar during extraction
- No page refresh required, the UI updates in real time


### 7. Chat History (Per-Device)
The full conversation history is saved to the browser's localStorage. If the user refreshes the page or navigates away, the chat is restored exactly as they left it. Clearing the folder also clears the chat history.

### 8. Refresh Folder Contents
A **Refresh Folder Contents** button in the sidebar re-runs the ingestion pipeline on the same folder. This picks up any new files added to the folder since it was last loaded, without requiring the user to re-paste the Drive link. Progress is shown inline in the sidebar during the refresh.

### 9. Per-User Data Isolation
Every user gets their own Pinecone namespace (`user_{google_sub}`). There is no cross-user data leakage, querying one user's namespace cannot return another user's documents.

### 10. Rate Limiting
Two rate limiters protect the API:
- **Chat:** 20 messages per user per minute (sliding window)
- **Folder load:** 5 folder loads per user per 10 minutes

Rate limiting prevents runaway AI costs and ensures fair usage across users.

### 11. Input Validation
- Questions are validated server-side: must be non-empty, max 1,000 characters
- Folder URLs are validated: must be a valid Google Drive URL
- All validation errors return clear, user-friendly messages, never raw exceptions

### 12. Secure Authentication
- Google access token is stored **server-side only**, it never travels to the browser after the initial login
- The JWT stored in the browser contains only non-sensitive claims (name, email, picture)
- JWTs expire after 1 hour
- A `/auth/logout` endpoint revokes the server-side token, invalidating the session immediately

---


## Known Limitations

1. **Scanned PDFs** — Image-based PDFs (scanned documents) contain no selectable text and will be skipped. OCR is not currently implemented.
2. **Single folder per user** — Each user can have one active folder at a time. Loading a new folder replaces the previous one.
3. **In-memory state** — The server-side token store and rate limiter are in-memory. A server restart clears them, requiring users to sign in again.
4. **30-file limit** — Folders with more than 30 files are truncated to the first 30 supported files found.
5. **No streaming chat responses** — Claude's answer is returned in full after generation completes, not token-by-token.
6. **Chat history is per-device** — Conversation history is stored in localStorage, so it does not sync across devices.
