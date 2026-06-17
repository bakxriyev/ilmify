import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()


def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_exp": True},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def extract_center_id(payload: dict) -> int | None:
    val = payload.get("center_id") or payload.get("centerId")
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def extract_admin_id(payload: dict) -> str | None:
    return payload.get("id") or payload.get("sub")


def extract_role(payload: dict) -> str:
    return payload.get("role", "admin")
