export function clamp(v: number, min: number, max: number) {
  return v < min ? min : (v > max) ? max : v
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]) {
  let dot = 0
  let l2norma = 0
  let l2normb = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!
    l2norma += a[i]! * a[i]!
    l2normb += b[i]! * b[i]!
  }

  const denominator = Math.sqrt(l2norma) * Math.sqrt(l2normb)
  return denominator === 0 ? 0 : dot / denominator
}
