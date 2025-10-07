from passlib.hash import argon2
from config import settings
from datetime import timedelta, datetime, timezone
from models.token import Token
from pydantic import UUID4
import jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return argon2.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return argon2.hash(password)

def create_access_token(user_id: UUID4) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(minutes=settings.token_expiration_minutes)
    
    token = Token(
        id=user_id,
        expiration=int(expiration.timestamp()),
        token_type="access"
    )
    payload = token.model_dump()
    return jwt.encode(payload, settings.private_token_key, algorithm=settings.token_algorithm)

def decode_token(token_str: str) -> Token:
    payload = jwt.decode(token_str, settings.public_token_key, algorithms=[settings.token_algorithm])
    token = Token(**payload)
    
    # Check expiration manually
    now = int(datetime.now(timezone.utc).timestamp())
    if token.expiration < now:
        raise TimeoutError("Token expired")
    
    return token