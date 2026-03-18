import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

app = FastAPI()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            message = await ws.receive()

            if "text" in message:
                await handle_text_message(ws, message["text"])
            elif "bytes" in message:
                await handle_binary_message(ws, message["bytes"])
    except WebSocketDisconnect:
        pass


async def handle_text_message(ws: WebSocket, raw: str):
    data = json.loads(raw)
    msg_type = data.get("type", "")

    # Route by message type — extend as needed
    await ws.send_json({"type": "ack", "received": msg_type})


async def handle_binary_message(ws: WebSocket, audio: bytes):
    # Placeholder: process incoming audio, send response audio back
    await ws.send_bytes(audio)


# Static files mount — must be last so /ws takes priority
app.mount("/", StaticFiles(directory="client", html=True), name="client")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
