const IDENT = /[A-Za-z_]\w*/g

function evalRaw(expr: string, vars: Record<string, number>): unknown {
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return Number(expr)
  }
  const js = expr.replace(IDENT, (id) => `(${vars[id] ?? 0})`)
  const fn = new Function(`"use strict";return (${js});`)
  return fn()
}

export function evalNum(expr: string, vars: Record<string, number>): number {
  const v = evalRaw(expr, vars)
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`表达式结果非法：${expr}`)
  }
  return v
}

export function evalCond(expr: string, vars: Record<string, number>): boolean {
  return Boolean(evalRaw(expr, vars))
}
