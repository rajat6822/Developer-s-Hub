# CodeRoom Server

This is the Node.js backend for my part of CodeRoom. My work here is the Document & Sync Engine only.

## What I Built

- Added Socket.io document events for collaborative editing.
- Added a reusable delta service for insertion, deletion, and replacement.
- Added server-side validation for invalid positions, negative indexes, and deletes past the document end.
- Added a simple conflict strategy:
  - the server is the source of truth
  - edits are applied in arrival order
  - late edit positions are shifted when earlier edits changed document length
- Added MongoDB persistence through the `Room.document` field.
- Added initial sync so clients receive the current saved document when joining.
- Added unit tests for delta application, conflict adjustment, persistence behavior, duplicate deltas, and invalid deltas.

## Main Files

- `server.js` - starts Express, Socket.io, and MongoDB.
- `src/app.js` - Express app setup and health route.
- `src/models/Room.js` - Room schema with the `document` field.
- `src/socket/documentSocket.js` - `join-document`, `send-delta`, and `receive-delta` socket flow.
- `src/services/deltaService.js` - pure delta validation, adjustment, and application logic.
- `src/services/documentService.js` - document persistence and duplicate delta handling.
- `tests/deltaService.test.js` - delta engine tests.
- `tests/documentService.test.js` - persistence service tests.

## Environment

Create `server/.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=your_mongodb_atlas_connection_string
```

`MONGODB_URI` must point to MongoDB Atlas or another MongoDB instance before real document persistence will work.

## Run Locally

```bash
npm install
npm run dev
```

The server runs on:

```text
http://localhost:5000
```

Health check:

```text
GET /health
```

## Socket Events

Client sends:

```text
join-document
send-delta
```

Server sends:

```text
receive-delta
```

`send-delta` payload:

```json
{
  "roomId": "ROOM_CODE",
  "position": 2,
  "insertedText": "X",
  "deletedLength": 0,
  "timestamp": 1780000000000
}
```

## Test

```bash
npm test
```

## Not Part of My Work

I did not build authentication, login, signup, room creation, join-room logic, participant lists, typing indicators, code execution, host controls, deployment, or version history.
