import time
import logging
import jwt
import httpx
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Server-side token store: google_sub → {access_token, expires_at}
# Keeps the Google access token off the JWT (which lives in the browser)
_token_store: dict[str, dict] = {}

TOKEN_TTL_SECONDS = 3600  # 1 hour, matches JWT expiry


def store_access_token(google_sub: str, access_token: str) -> None:
    _token_store[google_sub] = {
        "access_token": access_token,
        "expires_at": time.time() + TOKEN_TTL_SECONDS,
    }
    logger.info("Stored access token for user %s", google_sub)


def get_stored_access_token(google_sub: str) -> str | None:
    entry = _token_store.get(google_sub)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        _token_store.pop(google_sub, None)
        logger.info("Access token expired for user %s", google_sub)
        return None
    return entry["access_token"]


def revoke_access_token(google_sub: str) -> None:
    _token_store.pop(google_sub, None)
    logger.info("Revoked access token for user %s", google_sub)


async def verify_google_token(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token.")
        return response.json()


def create_jwt(google_sub: str, email: str, name: str, picture: str) -> str:
    payload = {
        "sub": google_sub,
        "email": email,
        "name": name,
        "picture": picture,
        "exp": datetime.utcnow() + timedelta(seconds=TOKEN_TTL_SECONDS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, settings.jwt_secret, algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session. Please sign in again.")

    google_sub = payload["sub"]
    access_token = get_stored_access_token(google_sub)
    if not access_token:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")

    # Inject access token so route handlers can use it without it ever touching the client
    payload["google_access_token"] = access_token
    return payload
