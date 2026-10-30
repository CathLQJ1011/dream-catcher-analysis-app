"""Passwords and login sessions (decision 13)."""

from __future__ import annotations

import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

_hasher = PasswordHasher()
# Hashing something even when the email doesn't exist keeps login timing the same
# for real and unknown emails, so timing can't reveal who has an account.
_DUMMY_HASH = _hasher.hash("not-a-real-password")

SESSION_COOKIE = "dc_session"
SESSION_DAYS = 30
# Browsers only send Secure cookies over https; local development runs on http.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except VerificationError:
        return False


def new_session_token() -> tuple[str, str, datetime]:
    """(token for the cookie, hash for the database, expiry)."""
    token = secrets.token_urlsafe(32)
    return token, token_hash(token), datetime.now(UTC) + timedelta(days=SESSION_DAYS)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
