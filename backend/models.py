from pydantic import BaseModel, field_validator
from typing import Optional

MAX_QUESTION_LENGTH = 1000
MAX_FOLDER_URL_LENGTH = 500


class GoogleAuthRequest(BaseModel):
    access_token: str


class AuthResponse(BaseModel):
    jwt: str
    email: str
    name: str
    picture: Optional[str]


class FolderLoadRequest(BaseModel):
    folder_url: str

    @field_validator("folder_url")
    @classmethod
    def validate_folder_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Folder URL cannot be empty.")
        if len(v) > MAX_FOLDER_URL_LENGTH:
            raise ValueError("Folder URL is too long.")
        if "drive.google.com" not in v:
            raise ValueError("Please provide a valid Google Drive folder URL.")
        return v


class FileInfo(BaseModel):
    file_id: str
    name: str
    mime_type: str
    size: Optional[int]


class FolderStatusResponse(BaseModel):
    loaded: bool
    files: list[FileInfo] = []
    chunk_count: int = 0
    folder_url: Optional[str] = None


class ChatRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty.")
        if len(v) > MAX_QUESTION_LENGTH:
            raise ValueError(
                f"Question is too long. Please keep it under {MAX_QUESTION_LENGTH} characters."
            )
        return v


class Citation(BaseModel):
    filename: str
    page: Optional[int]
    file_id: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
