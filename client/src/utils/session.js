const usernamePrefix = 'coderoom:username:'

export function getRoomUsername(roomId) {
  return window.sessionStorage.getItem(`${usernamePrefix}${roomId}`) || ''
}

export function saveRoomUsername(roomId, username) {
  window.sessionStorage.setItem(`${usernamePrefix}${roomId}`, username)
}
