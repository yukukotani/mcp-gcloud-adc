import assert from 'node:assert/strict'
import { test } from 'vitest'
import { add } from './add.js'

test('add関数は正しく加算を行う', () => {
  assert(add(1, 2) === 3)
  assert(add(-1, 1) === 0)
  assert(add(0, 0) === 0)
})

test('power-assertのデモンストレーション', () => {
  const numbers = [1, 2, 3]
  const result = add(numbers[0], numbers[1])
  const expected = 3

  assert(result === expected)
})
