from fastapi import FastAPI

from app import errors
from app.routers import auth, dreams, me, shares

app = FastAPI(title="Dream Catcher API")
errors.install(app)

for router in (auth.router, me.router, dreams.router, shares.router):
    app.include_router(router, prefix="/api/v1")


# Simple check that the server is running
@app.get("/health")
def health():
    return {"status": "ok"}
