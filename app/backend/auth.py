
Action: file_editor create /app/backend/auth.py --file-text "\"\"\"JWT authentication helpers.\"\"\"
import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


JWT_SECRET = os.environ.get(\"JWT_SECRET\", \"dev-secret\")
JWT_ALGORITHM = os.environ.get(\"JWT_ALGORITHM\", \"HS256\")
JWT_EXPIRE_HOURS = int(os.environ.get(\"JWT_EXPIRE_HOURS\", \"72\"))

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(\"utf-8\"), bcrypt.gensalt()).decode(\"utf-8\")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(\"utf-8\"), hashed.encode(\"utf-8\"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        \"sub\": user_id,
        \"role\": role,
        \"exp\": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        \"iat\": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail=\"Token expired\")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail=\"Invalid token\")


async def get_current_user_payload(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail=\"Missing auth token\")
    return decode_token(creds.credentials)


def require_roles(*roles: str):
    async def checker(payload: dict = Depends(get_current_user_payload)):
        if payload.get(\"role\") not in roles:
            raise HTTPException(status_code=403, detail=\"Forbidden\")
        return payload
    return checker
"
Observation: Create successful: /app/backend/auth.py