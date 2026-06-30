// Delta shape: { position, insertedText, deletedLength, timestamp }.
// The server owns the document; clients only send the changed range.

function normalizeInsertedText(insertedText) {
  return typeof insertedText === 'string' ? insertedText : ''
}

function getDeltaLengthChange(delta) {
  return normalizeInsertedText(delta.insertedText).length - delta.deletedLength
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && secondStart < firstEnd
}

// Keep socket payload validation boring and strict. Bad edits are rejected, not thrown.
function validateDelta(delta, documentLength) {
  if (!delta || typeof delta !== 'object') {
    return { isValid: false, reason: 'Delta must be an object.' }
  }

  if (!Number.isInteger(delta.position) || delta.position < 0) {
    return { isValid: false, reason: 'Delta position must be a non-negative integer.' }
  }

  if (!Number.isInteger(delta.deletedLength) || delta.deletedLength < 0) {
    return { isValid: false, reason: 'Delta deletedLength must be a non-negative integer.' }
  }

  if (typeof delta.insertedText !== 'string') {
    return { isValid: false, reason: 'Delta insertedText must be a string.' }
  }

  if (delta.position > documentLength) {
    return { isValid: false, reason: 'Delta position is greater than document length.' }
  }

  if (delta.position + delta.deletedLength > documentLength) {
    return { isValid: false, reason: 'Delta deletion runs past document length.' }
  }

  if (delta.insertedText.length === 0 && delta.deletedLength === 0) {
    return { isValid: false, reason: 'Delta must insert or delete at least one character.' }
  }

  return { isValid: true, reason: null }
}

// Pure string update used by both the socket flow and tests.
function applyDelta(document, delta) {
  const safeDocument = typeof document === 'string' ? document : ''
  const insertedText = normalizeInsertedText(delta.insertedText)
  const before = safeDocument.slice(0, delta.position)
  const after = safeDocument.slice(delta.position + delta.deletedLength)

  return `${before}${insertedText}${after}`
}

// Conflict rule: accept edits in server arrival order, shift stale positions, and
// clamp overlapping deletes to the current server document instead of failing.
function adjustDeltaPosition(delta, appliedDeltas, documentLength) {
  const adjustedDelta = {
    ...delta,
    insertedText: normalizeInsertedText(delta.insertedText),
  }
  const comparableTimestamp = Number(delta.timestamp) || 0

  const positionShift = appliedDeltas.reduce((shift, appliedDelta) => {
    if ((Number(appliedDelta.timestamp) || 0) <= comparableTimestamp) {
      return shift
    }

    if (appliedDelta.position > adjustedDelta.position) {
      return shift
    }

    return shift + getDeltaLengthChange(appliedDelta)
  }, 0)

  adjustedDelta.position = clampNumber(adjustedDelta.position + positionShift, 0, documentLength)

  const requestedDeleteEnd = adjustedDelta.position + adjustedDelta.deletedLength
  adjustedDelta.deletedLength = clampNumber(adjustedDelta.deletedLength, 0, documentLength - adjustedDelta.position)

  for (const appliedDelta of appliedDeltas) {
    if ((Number(appliedDelta.timestamp) || 0) <= comparableTimestamp) {
      continue
    }

    const appliedStart = clampNumber(appliedDelta.position, 0, documentLength)
    const appliedEnd = clampNumber(appliedDelta.position + appliedDelta.deletedLength, appliedStart, documentLength)

    if (
      adjustedDelta.deletedLength > 0 &&
      rangesOverlap(adjustedDelta.position, requestedDeleteEnd, appliedStart, appliedEnd)
    ) {
      const overlapStart = Math.max(adjustedDelta.position, appliedStart)
      const overlapEnd = Math.min(requestedDeleteEnd, appliedEnd)
      adjustedDelta.deletedLength = Math.max(0, adjustedDelta.deletedLength - (overlapEnd - overlapStart))
    }
  }

  return adjustedDelta
}

module.exports = {
  applyDelta,
  adjustDeltaPosition,
  getDeltaLengthChange,
  validateDelta,
}
