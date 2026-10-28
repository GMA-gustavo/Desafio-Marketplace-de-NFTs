async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function hashPassword(password: string, salt: string) {
  return sha256Hex(`${salt}:${password}`)
}

export function hashPayload(payload: unknown) {
  return sha256Hex(JSON.stringify(payload))
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

export function randomHex(bytes: number) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return `0x${[...buf].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}
