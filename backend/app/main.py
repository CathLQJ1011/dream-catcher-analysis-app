from fastapi import FastAPI

from app import errors
from app.routers import auth, dreams, feelings, me, patterns, readings, shares, suggest

app = FastAPI(title="Dream Catcher API")
errors.install(app)

for router in (auth.router, me.router, suggest.router, dreams.router, shares.router, patterns.router, readings.router, feelings.router):
    app.include_router(router, prefix="/api/v1")


# Simple check that the server is running
@app.get("/health")
def health():
    return {"status": "ok"}
