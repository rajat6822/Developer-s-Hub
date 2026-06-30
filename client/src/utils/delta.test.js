import assert from 'node:assert/strict'
import test from 'node:test'
import { applyDelta, generateDelta } from './delta.js'

test('generateDelta creates insertion deltas', () => {
  assert.deepEqual(generateDelta('Hello', 'HeXllo', 1), {
    position: 2,
    insertedText: 'X',
    deletedLength: 0,
    timestamp: 1,
  })
})

test('generateDelta creates deletion deltas', () => {
  assert.deepEqual(generateDelta('Hello', 'Hlo', 1), {
    position: 1,
    insertedText: '',
    deletedLength: 2,
    timestamp: 1,
  })
})

test('generateDelta creates replacement deltas', () => {
  assert.deepEqual(generateDelta('Hello', 'Hallo', 1), {
    position: 1,
    insertedText: 'a',
    deletedLength: 1,
    timestamp: 1,
  })
})

test('generateDelta handles paste-sized inserts and local applyDelta replays them', () => {
  const delta = generateDelta('', 'const value = 1;', 1)

  assert.equal(applyDelta('', delta), 'const value = 1;')
})

test('generateDelta returns null when nothing changed', () => {
  assert.equal(generateDelta('same', 'same', 1), null)
})
