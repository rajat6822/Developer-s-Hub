# CodeRoom Server

Express + Socket.IO + MongoDB backend for CodeRoom.

## Features

- `GET /health` health check.
- `POST /create-room` creates a unique room and stores the host username.
- `POST /join-room` validates room code, username, and closed-room state.
- Socket room join with persisted document snapshot and host metadata.
- Delta-based document persistence through the existing document sync engine.
- Live participant broadcasts through `participant-list`.
- Typing presence through `typing` and `stopTyping`.
- Host-only `close-room` control with server-side authorization.
- Persisted `closedAt` state to prevent future joins and edits.

## Project Structure

```text
server.js
src/
  app.js
  models/Room.js
  services/
    deltaService.js
    documentService.js
  socket/
    documentSocket.js
  store/
    participantStore.js
    reconnectStore.js
    typingStore.js
  utils/
    participantHelper.js
    socketValidation.js
tests/
```

## Environment

Copy `.env.example` to `.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
```

For deployment, add these same values in the hosting provider's environment settings. The local `server/.env` file is ignored by Git and is not uploaded automatically.

If MongoDB Atlas connects locally but not after deployment, open Atlas Network Access and allow the deployment provider's outbound IP. For a short hack-sprint demo on free-tier hosts with changing outbound IPs, `0.0.0.0/0` works, then tighten it later.

## HTTP API

`GET /health`

```json
{ "status": "ok" }
```

`POST /create-room`

```json
{ "username": "Arun" }
```

Success:

```json
{ "ok": true, "roomCode": "ABC123" }
```

`POST /join-room`

```json
{ "roomCode": "ABC123", "username": "Rahul" }
```

Returns `403` with `Room is closed.` when the host has closed the room.

## Socket Events

Client sends:

- `join-document` with `{ roomId, username }`
- `send-delta` with `{ roomId, position, insertedText, deletedLength, timestamp }`
- `typing` with `{ roomId, username }`
- `stopTyping` with `{ roomId, username }`
- `leave-room` with `{ roomId }`
- `close-room` with `{ roomId }`

Server sends:

- `receive-delta`
- `participant-list`
- `typing`
- `stopTyping`
- `room-closed`
- `kicked`

`close-room` is authorized on the server by checking the active socket membership and the persisted `Room.host.username`. Non-host clients receive an acknowledgement with `ok: false`.

## Run Locally

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:5000
```

## Test

```bash
npm test
```
