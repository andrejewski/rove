import test from 'ava'
import leftPad from '../src'

test('should work', t => {
  t.is(leftPad('poop', 8), '    poop')
})

test('should use a given pad', t => {
  t.is(leftPad('poop', 8, 'p'), 'pppppoop')
})
