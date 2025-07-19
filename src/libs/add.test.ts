import { expect, test } from 'vitest'
import { add } from './add.js'

test('add関数は正しく加算を行う', () => {
  expect(add(1, 2)).toBe(3)
  expect(add(-1, 1)).toBe(0)
  expect(add(0, 0)).toBe(0)
})
