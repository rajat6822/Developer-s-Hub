const assert = require('node:assert/strict')
const test = require('node:test')
const { applyDelta, adjustDeltaPosition, validateDelta } = require('../src/services/deltaService')

test('applyDelta inserts text', () => {
  assert.equal(applyDelta('Hello', { position: 2, insertedText: 'X', deletedLength: 0 }), 'HeXllo')
})

test('applyDelta deletes text', () => {
  assert.equal(applyDelta('Hello', { position: 1, insertedText: '', deletedLength: 2 }), 'Hlo')
})

test('applyDelta replaces text', () => {
  assert.equal(applyDelta('Hello', { position: 1, insertedText: 'ar', deletedLength: 3 }), 'Haro')
})

test('validateDelta rejects invalid positions', () => {
  assert.equal(validateDelta({ position: -1, insertedText: 'x', deletedLength: 0 }, 5).isValid, false)
  assert.equal(validateDelta({ position: 6, insertedText: 'x', deletedLength: 0 }, 5).isValid, false)
})

test('validateDelta rejects deletions past the end of the document', () => {
  assert.equal(validateDelta({ position: 4, insertedText: '', deletedLength: 2 }, 5).isValid, false)
})

test('adjustDeltaPosition shifts late edits after prior insertions', () => {
  const adjusted = adjustDeltaPosition(
    { position: 2, insertedText: 'Y', deletedLength: 0, timestamp: 100 },
    [{ position: 1, insertedText: 'XX', deletedLength: 0, timestamp: 200 }],
    7,
  )

  assert.equal(adjusted.position, 4)
})

test('adjustDeltaPosition shifts late edits after prior deletions', () => {
  const adjusted = adjustDeltaPosition(
    { position: 4, insertedText: 'Y', deletedLength: 0, timestamp: 100 },
    [{ position: 1, insertedText: '', deletedLength: 2, timestamp: 200 }],
    3,
  )

  assert.equal(adjusted.position, 2)
})
