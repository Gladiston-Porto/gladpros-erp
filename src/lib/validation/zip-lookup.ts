// Cache em memória para evitar chamadas repetidas ao mesmo ZIP
const zipCache = new Map<string, { city: string; state: string } | null>()

export interface ZipLookupResult {
  city: string
  state: string
}

/**
 * Consulta cidade e estado a partir de um ZIP code americano (5 dígitos).
 * Usa zippopotam.us — gratuito, sem autenticação.
 * Falha silenciosamente: retorna null em caso de ZIP não encontrado ou timeout.
 */
export async function lookupZip(zip: string): Promise<ZipLookupResult | null> {
  const baseZip = zip.replace(/\D/g, '').slice(0, 5)
  if (baseZip.length !== 5) return null

  if (zipCache.has(baseZip)) return zipCache.get(baseZip)!

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2500)

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${baseZip}`, {
      signal: controller.signal,
    })

    if (!res.ok) {
      zipCache.set(baseZip, null)
      return null
    }

    const data = await res.json()
    const place = data?.places?.[0]
    if (!place) {
      zipCache.set(baseZip, null)
      return null
    }

    const result: ZipLookupResult = {
      city: place['place name'] as string,
      state: place['state abbreviation'] as string,
    }
    zipCache.set(baseZip, result)
    return result
  } catch {
    // timeout ou erro de rede — não cachear para permitir nova tentativa
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}
