from fastapi import FastAPI

app = FastAPI()

# Simple check that the server is running
@app.get("/health")
def health():
    return {"status": "ok"}