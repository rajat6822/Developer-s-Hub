# CodeRoom Client

This is the React + Vite frontend for my part of CodeRoom. My work here is only the shared document editor and socket sync flow.

## What I Built

- Built a plain `textarea` editor for shared code editing.
- Added delta generation so the client sends only the changed text range instead of the full document.
- Added Socket.io client wiring for:
  - initial document sync
  - sending local edits with `send-delta`
  - receiving remote edits with `receive-delta`
- Added local replay of accepted server deltas.
- Added small tests for insertion, deletion, replacement, paste-sized inserts, and no-op edits.

## Main Files

- `src/components/Editor.jsx` - editor UI and room display.
- `src/hooks/useEditorSync.js` - socket lifecycle and editor state sync.
- `src/utils/delta.js` - delta generation and local delta application.
- `src/utils/socket.js` - Socket.io client setup.
- `src/utils/delta.test.js` - unit tests for client delta logic.

## Run Locally

```bash
npm install
npm run dev
```

The client runs on:

```text
http://localhost:5173
```

To open a specific room document:

```text
http://localhost:5173?roomId=ROOM_CODE
```

If no room id is provided, the client uses `DEMO`.

## Test and Build

```bash
npm test
npm run lint
npm run build
```

## Not Part of My Work

I did not build authentication, room creation, participant lists, typing indicators, cursor sharing, syntax highlighting, code execution, or deployment.
