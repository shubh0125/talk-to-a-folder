# Talk to a Folder

An AI-powered Google Drive document assistant. Paste any Google Drive folder URL, and chat with your documents using RAG (Retrieval-Augmented Generation).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│  React + Vite + Tailwind CSS + @react-oauth/google      │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (REST + SSE)
┌────────────────────────▼────────────────────────────────┐
│                    FastAPI Backend                       │
│                                                         │
│  /auth/google  → verify Google token → issue JWT        │
│  /folder/load  → Drive API → extract → chunk →          │
│                  embed (OpenAI) → upsert (Pinecone)      │
│                  streams progress via SSE               │
│  /chat         → embed query → retrieve → Claude answer │
│  /folder/clear → delete Pinecone namespace              │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  Google     │          │    Pinecone      │
│  Drive API  │          │  Vector Store    │
│  (files)    │          │  (embeddings)    │
└─────────────┘          └─────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  OpenAI     │          │   Anthropic      │
│  Embeddings │          │  Claude (chat)   │
└─────────────┘          └─────────────────┘
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- A Google Cloud project with OAuth 2.0 credentials
- A Pinecone account (free tier works)
- OpenAI API key
- Anthropic API key

---

## 1. Google Cloud Console Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Navigate to **APIs & Services → Library** and enable:
   - **Google Drive API**
4. Navigate to **APIs & Services → OAuth consent screen**:
   - Choose **External**
   - Fill in app name, support email, developer email
   - Add scope: `https://www.googleapis.com/auth/drive.readonly`
   - Add your Google account as a test user
5. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://your-vercel-domain.vercel.app
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5173
     https://your-vercel-domain.vercel.app
     ```
   - Save the **Client ID** and **Client Secret**

---

## 2. Pinecone Setup

1. Create a free account at [pinecone.io](https://www.pinecone.io)
2. Create a new index:
   - **Name:** `talk-to-folder`
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
   - **Cloud:** AWS `us-east-1` (free tier)
3. Copy your **API key** from the Pinecone dashboard

---

## 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and fill in all values:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=talk-to-folder
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
JWT_SECRET=some-long-random-secret-string
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Check `http://localhost:8000/health`.

---

## 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
VITE_BACKEND_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## 5. Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Push to GitHub and connect repo in Vercel dashboard
```

In Vercel project settings → Environment Variables, add:
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_BACKEND_URL` → your Railway URL

### Backend → Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo, set root directory to `backend/`
3. Add all environment variables from `backend/.env`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Update `FRONTEND_URL` to your Vercel domain
6. Update Google Cloud Console with your Vercel domain in authorized origins/redirects

---

## Environment Variable Reference

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | backend | Anthropic API key for Claude |
| `OPENAI_API_KEY` | backend | OpenAI API key for embeddings |
| `PINECONE_API_KEY` | backend | Pinecone API key |
| `PINECONE_INDEX_NAME` | backend | Pinecone index name (default: `talk-to-folder`) |
| `GOOGLE_CLIENT_ID` | backend | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | backend | Google OAuth client secret |
| `JWT_SECRET` | backend | Random secret for signing JWTs |
| `FRONTEND_URL` | backend | Frontend origin for CORS |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Google OAuth client ID (same as backend) |
| `VITE_BACKEND_URL` | frontend | Backend base URL |

---

## Supported File Types

| Type | Extension | Notes |
|---|---|---|
| Google Docs | — | Exported as plain text |
| Google Sheets | — | Exported as CSV |
| Google Slides | — | Exported as plain text |
| PDF | `.pdf` | Text extracted per page with page numbers |
| Word | `.docx` | Paragraphs extracted |
| PowerPoint | `.pptx` | Slide text extracted per slide |
| Plain text | `.txt` | Read directly |

Limits: max **30 files** per folder, max **10 MB** per file.
