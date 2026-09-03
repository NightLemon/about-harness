import { type JsonValue, type TaskSpec } from './contracts.js'

export interface AcceptanceResult {
  accepted: boolean
  feedback: string
  evidence: Record<string, JsonValue>
}

export interface AcceptanceValidator {
  readonly name: string
  validate(task: TaskSpec, output: JsonValue): unknown
}

export class JsonSubsetAcceptanceValidator implements AcceptanceValidator {
  readonly name = 'json-subset-v1'

  validate(task: TaskSpec, output: JsonValue): AcceptanceResult {
    const failedPaths: string[] = []
    const criteriaCount = Object.keys(task.acceptance).length
    if (criteriaCount > 0) compareSubset(task.acceptance, output, '', failedPaths)
    const accepted = failedPaths.length === 0
    return {
      accepted,
      feedback: accepted
        ? criteriaCount === 0
          ? 'no acceptance constraints were declared'
          : 'all declared acceptance values matched'
        : `acceptance mismatch at ${failedPaths.join(', ')}`,
      evidence: {
        validator: this.name,
        top_level_criteria: criteriaCount,
        failed_paths: failedPaths
      }
    }
  }
}

export function validateAcceptanceResult(value: unknown): AcceptanceResult {
  if (!isRecord(value)) throw new TypeError('acceptance result must be an object')
  requireExactKeys(value, ['accepted', 'feedback', 'evidence'])
  const accepted = value.accepted
  const feedback = value.feedback
  const rawEvidence = value.evidence
  if (typeof accepted !== 'boolean') {
    throw new TypeError('acceptance result must contain a boolean decision')
  }
  if (typeof feedback !== 'string' || feedback.trim().length === 0) {
    throw new TypeError('acceptance result must contain non-empty feedback')
  }
  if (!isRecord(rawEvidence)) {
    throw new TypeError('acceptance result evidence must be a JSON object')
  }
  return {
    accepted,
    feedback,
    evidence: copyJsonRecord(rawEvidence, new Set())
  }
}

export function validateValidatorName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('acceptance validator must contain a non-empty name')
  }
  return value
}

function compareSubset(
  expected: JsonValue,
  actual: JsonValue,
  path: string,
  failedPaths: string[]
): void {
  const displayPath = path || '/'
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      failedPaths.push(displayPath)
      return
    }
    expected.forEach((item, index) => compareSubset(item, actual[index] as JsonValue, `${path}/${index}`, failedPaths))
    return
  }
  if (isJsonRecord(expected)) {
    if (!isJsonRecord(actual)) {
      failedPaths.push(displayPath)
      return
    }
    for (const [key, value] of Object.entries(expected)) {
      const childPath = `${path}/${escapePointer(key)}`
      if (!Object.hasOwn(actual, key)) {
        failedPaths.push(childPath)
        continue
      }
      compareSubset(value, actual[key] as JsonValue, childPath, failedPaths)
    }
    return
  }
  if (expected !== actual) failedPaths.push(displayPath)
}

function escapePointer(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function requireExactKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) throw new TypeError(`acceptance result contains unknown field: ${unknown[0]}`)
  const missing = allowed.filter((key) => !Object.hasOwn(value, key))
  if (missing.length > 0) throw new TypeError(`acceptance result is missing field: ${missing[0]}`)
}

function copyJsonRecord(value: Record<string, unknown>, seen: Set<object>): Record<string, JsonValue> {
  return copyJsonTree(value, seen) as Record<string, JsonValue>
}

function copyJsonTree(value: unknown, seen: Set<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value
    throw new TypeError('acceptance result evidence contains a non-finite number')
  }
  if (Array.isArray(value) || isRecord(value)) {
    if (seen.has(value)) throw new TypeError('acceptance result evidence contains a cycle')
    seen.add(value)
    try {
      if (Array.isArray(value)) return value.map((item) => copyJsonTree(item, seen))
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, copyJsonTree(item, seen)])
      )
    } finally {
      seen.delete(value)
    }
  }
  throw new TypeError('acceptance result evidence must be JSON-compatible')
}
