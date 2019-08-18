/*
 * Jexl
 * Copyright 2019 Tom Shawver
 */

const Jexl = require('lib/Jexl')
let inst

describe('Jexl', () => {
  beforeEach(() => {
    inst = new Jexl.Jexl()
  })
  describe('eval', () => {
    it('resolves Promise on success', async () => {
      await expect(inst.eval('2+2')).resolves.toBe(4)
    })
    it('rejects Promise on error', async () => {
      await expect(inst.eval('2++2')).rejects.toThrow(/unexpected/)
    })
    it('passes context', async () => {
      await expect(inst.eval('foo', { foo: 'bar' })).resolves.toBe('bar')
    })
  })
  describe('evalSync', () => {
    it('returns success', () => {
      expect(inst.evalSync('2+2')).toBe(4)
    })
    it('throws on error', async () => {
      expect(inst.evalSync.bind(inst, '2++2')).toThrow(/unexpected/)
    })
    it('passes context', async () => {
      expect(inst.evalSync('foo', { foo: 'bar' })).toBe('bar')
      it('throws if transform fails', async () => {
        inst.addTransform('abort', (val, args) => { throw new Error('oops') })
        expect(inst.evalSync.bind(inst, '"hello"|abort')).toThrow(/oops/)
      })
    })
  })
  describe('addTransform', () => {
    it('allows transforms to be defined', async () => {
      inst.addTransform('toCase', (val, args) => args.case === 'upper' ? val.toUpperCase() : val.toLowerCase())
      await expect(inst.eval('"hello"|toCase({case:"upper"})')).resolves.toBe('HELLO')
    })
    it('allows transforms to be retrieved', () => {
      inst.addTransform('ret2', () => 2)
      const t = inst.getTransform('ret2')
      expect(t).toBeDefined()
      expect(t()).toBe(2)
    })
    it('allows transforms to be set in batch', async () => {
      inst.addTransforms({
        add1: (val) => val + 1,
        add2: (val) => val + 2
      })
      await expect(inst.eval('2|add1|add2')).resolves.toBe(5)
    })
  })
  describe('addBinaryOp', () => {
    it('allows binaryOps to be defined', async () => {
      inst.addBinaryOp('_=', 20, (left, right) => left.toLowerCase() === right.toLowerCase())
      await expect(inst.eval('"FoO" _= "fOo"')).resolves.toBe(true)
    })
    it('observes weight on binaryOps', async () => {
      inst.addBinaryOp('**', 0, (left, right) => left * 2 + right * 2)
      inst.addBinaryOp('***', 1000, (left, right) => left * 2 + right * 2)
      await expect(Promise.all([
        inst.eval('1 + 2 ** 3 + 4'),
        inst.eval('1 + 2 *** 3 + 4')
      ])).resolves.toEqual([20, 15])
    })
  })
  describe('addUnaryOp', () => {
    it('allows unaryOps to be defined', async () => {
      inst.addUnaryOp('~', (right) => Math.floor(right))
      await expect(inst.eval('~5.7 + 5')).resolves.toBe(10)
    })
  })
  describe('removeOp', () => {
    it('allows binaryOps to be removed', async () => {
      inst.removeOp('+')
      await expect(inst.eval('1+2')).rejects.toThrow(/invalid/i)
    })
    it('allows unaryOps to be removed', async () => {
      inst.removeOp('!')
      await expect(inst.eval('!true')).rejects.toThrow(/invalid/i)
    })
  })
})
