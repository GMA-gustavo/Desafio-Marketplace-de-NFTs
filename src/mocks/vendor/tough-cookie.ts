/**
 * Substitui o `tough-cookie` no bundle do MSW (alias no vite.config.ts).
 *
 * O MSW só o usa para guardar cookies definidos pelas respostas mockadas. A API simulada
 * autentica por Bearer token e nunca envia `Set-Cookie`, então o cookie store fica sempre
 * vazio — e o bundle dos mocks perde ~250 KB (tough-cookie + tldts) antes do primeiro render.
 */
// oxlint-disable-next-line typescript/no-extraneous-class -- espelha a API do tough-cookie
export class Cookie {
  static fromJSON(): null {
    return null
  }
}

export class MemoryCookieStore {
  idx: Record<string, unknown> = {}
}

export class CookieJar {
  getCookiesSync(): Cookie[] {
    return []
  }

  async setCookie(): Promise<void> {}
}
