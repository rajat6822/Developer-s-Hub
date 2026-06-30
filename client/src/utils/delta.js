// Build the smallest contiguous edit between two textarea snapshots.
export function generateDelta(previousDocument, nextDocument, timestamp = Date.now()) {
  const previousText = typeof previousDocument === 'string' ? previousDocument : ''
  const nextText = typeof nextDocument === 'string' ? nextDocument : ''

  if (previousText === nextText) {
    return null
  }

  let start = 0
  while (
    start < previousText.length &&
    start < nextText.length &&
    previousText[start] === nextText[start]
  ) {
    start += 1
  }

  let previousEnd = previousText.length - 1
  let nextEnd = nextText.length - 1
  while (
    previousEnd >= start &&
    nextEnd >= start &&
    previousText[previousEnd] === nextText[nextEnd]
  ) {
    previousEnd -= 1
    nextEnd -= 1
  }

  return {
    position: start,
    insertedText: nextText.slice(start, nextEnd + 1),
    deletedLength: previousEnd - start + 1,
    timestamp,
  }
}

// Replays an accepted server delta locally.
export function applyDelta(document, delta) {
  const source = typeof document === 'string' ? document : ''
  return `${source.slice(0, delta.position)}${delta.insertedText}${source.slice(
    delta.position + delta.deletedLength,
  )}`
}
