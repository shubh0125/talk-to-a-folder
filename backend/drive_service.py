import io
import re
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials
from fastapi import HTTPException
from models import FileInfo

SUPPORTED_MIME_TYPES = {
    "application/vnd.google-apps.document": "gdoc",
    "application/vnd.google-apps.spreadsheet": "gsheet",
    "application/vnd.google-apps.presentation": "gslides",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
}

MAX_FILES = 30
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def extract_folder_id(url: str) -> str:
    match = re.search(r'/folders/([a-zA-Z0-9_-]+)', url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid Google Drive folder URL")
    return match.group(1)


def get_drive_service(access_token: str):
    creds = Credentials(token=access_token)
    return build("drive", "v3", credentials=creds)


def list_files_in_folder(service, folder_id: str) -> list[FileInfo]:
    files = []
    page_token = None

    while True:
        query = f"'{folder_id}' in parents and trashed=false"
        response = service.files().list(
            q=query,
            fields="nextPageToken, files(id, name, mimeType, size)",
            pageToken=page_token,
            pageSize=100
        ).execute()

        for f in response.get("files", []):
            mime = f.get("mimeType", "")
            if mime in SUPPORTED_MIME_TYPES:
                size = int(f.get("size", 0)) if f.get("size") else 0
                if size <= MAX_FILE_SIZE or size == 0:
                    files.append(FileInfo(
                        file_id=f["id"],
                        name=f["name"],
                        mime_type=mime,
                        size=size
                    ))

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    if len(files) > MAX_FILES:
        files = files[:MAX_FILES]

    return files


def download_file(service, file: FileInfo) -> bytes:
    mime = file.mime_type
    file_id = file.file_id

    export_map = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
    }

    buffer = io.BytesIO()

    if mime in export_map:
        request = service.files().export_media(fileId=file_id, mimeType=export_map[mime])
    else:
        request = service.files().get_media(fileId=file_id)

    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()

    return buffer.getvalue()
