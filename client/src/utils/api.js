const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function postJson(path, body) {
  let response

  try {
    response = await fetch(`${apiUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  } catch (error) {
    throw new Error('Server Offline', { cause: error })
  }

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.reason || data?.message || response.statusText || 'Unexpected Error')
  }

  return data
}

export async function createRoom(username) {
  const data = await postJson('/create-room', { username })
  const roomCode = data.roomCode || data.roomId

  if (!roomCode) {
    throw new Error('Unexpected Error')
  }

  return { roomCode }
}

export async function joinRoom(roomCode, username) {
  await postJson('/join-room', { roomCode, roomId: roomCode, username })
  return { roomCode }
}

export function getFriendlyApiError(error, fallback) {
  const message = error?.message || fallback

  if (/failed to fetch|server offline/i.test(message)) {
    return 'Server offline. Please check that the backend is running.'
  }

  if (/room not found|invalid room|not found/i.test(message)) {
    return 'Room not found. Check the code and try again.'
  }

  if (/username/i.test(message)) {
    return 'Username is required.'
  }

  if (/network/i.test(message)) {
    return 'Network error. Please try again.'
  }

  if (/unexpected/i.test(message)) {
    return fallback
  }

  return message
}
