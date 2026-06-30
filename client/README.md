# CodeRoom Client

React + Vite frontend for CodeRoom.

## Features

- Custom routes for `/`, `/create`, `/join`, `/room/:roomId`, and not found.
- Room creation and join forms with friendly validation errors.
- Shared code editor with delta-based Socket.IO synchronization.
- Live participant panel from the `participant-list` socket event.
- Typing indicator using throttled `typing` and `stopTyping` socket events.
- Host-only close room control with confirmation modal.
- Room closed state that disables editing and offers a return home action.
- Offline, reconnecting, saving, and sync recovery states.

## Project Structure

```text
src/
  App.jsx
  App.css
  components/
    Editor.jsx
    ExperienceShell.jsx
    SceneBackground.jsx
    ui/
  hooks/
    useEditorSync.js
  pages/
    HomePage.jsx
    CreateRoomPage.jsx
    JoinRoomPage.jsx
    RoomPage.jsx
    NotFoundPage.jsx
  utils/
    api.js
    delta.js
    session.js
    socket.js
```

## Environment

Copy `.env.example` to `.env` for local development:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

For production, set both values to the deployed backend origin, for example:

```env
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com
```

## Run Locally

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:5173
```

## Test, Lint, Build

```bash
npm test
npm run lint
npm run build
```

## Vercel Deployment

1. Import the `client` folder as the Vercel project root.
2. Set framework preset to `Vite`.
3. Set build command to `npm run build`.
4. Set output directory to `dist`.
5. Add environment variables:
   - `VITE_API_URL`
   - `VITE_SOCKET_URL`
6. Add a rewrite so refresh works on client routes:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

7. Deploy, then test create room, join room, participant list, typing indicator, and close room on the live URL.
