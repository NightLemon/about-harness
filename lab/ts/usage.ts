export interface UsageObservation {
  schema_version: '1.0'
  token_status: 'known' | 'unknown'
  input_tokens: number | null
  output_tokens: number | null
  cost_status: 'known' | 'unknown'
  cost_usd: number | null
  source: 'fixture' | 'provider' | 'price-estimate'
}

export function validateUsage(value: unknown): UsageObservation {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid usage')
  const row = value as Record<string, unknown>
  const keys = ['schema_version', 'token_status', 'input_tokens', 'output_tokens', 'cost_status', 'cost_usd', 'source']
  if (Object.keys(row).length !== keys.length || keys.some(key => !(key in row)) || row.schema_version !== '1.0') throw new Error('invalid usage envelope')
  if (typeof row.source !== 'string' || !['fixture', 'provider', 'price-estimate'].includes(row.source)) throw new Error('invalid source')
  for (const key of ['input_tokens', 'output_tokens']) {
    const n = row[key]
    if (n !== null && (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0)) throw new Error('invalid tokens')
  }
  if ((row.input_tokens === null) !== (row.output_tokens === null)) throw new Error('incomplete tokens')
  if (row.token_status !== (row.input_tokens === null ? 'unknown' : 'known')) throw new Error('token status mismatch')
  const cost = row.cost_usd
  if (cost !== null && (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0)) throw new Error('invalid cost')
  if (row.cost_status !== (cost === null ? 'unknown' : 'known')) throw new Error('cost status mismatch')
  return row as unknown as UsageObservation
}
