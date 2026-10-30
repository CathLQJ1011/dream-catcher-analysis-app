"""Every error response has the same shape (docs/api-contract.md, Conventions):

    { "error": { "code": "dream_not_found", "message": "That dream doesn't exist.", "field": null } }
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, field: str | None = None):
        self.status, self.code, self.message, self.field = status, code, message, field


def not_found(what: str = "dream") -> ApiError:
    # Used for "doesn't exist" and "isn't yours" alike, so other people's data is never revealed.
    return ApiError(404, f"{what}_not_found", f"That {what} doesn't exist.")


def _body(code: str, message: str, field: str | None) -> dict:
    return {"error": {"code": code, "message": message, "field": field}}


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def api_error(_: Request, e: ApiError):
        return JSONResponse(_body(e.code, e.message, e.field), status_code=e.status)

    @app.exception_handler(RequestValidationError)
    async def invalid(_: Request, e: RequestValidationError):
        first = e.errors()[0]
        # loc looks like ("body", "valence") or ("query", "limit"); keep the part after the source.
        field = ".".join(str(p) for p in first["loc"][1:]) or None
        return JSONResponse(_body("invalid_value", first["msg"], field), status_code=422)
