import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler';

function codeToCondDesc(code: number) {
  // Mapeia weather_code do Open-Meteo para uma condição (en) + descrição (pt)
  if ([0].includes(code)) return { condition: 'Clear', desc: 'Céu limpo' }
  if ([1, 2, 3].includes(code)) return { condition: 'Clouds', desc: 'Parcialmente nublado' }
  if ([45, 48].includes(code)) return { condition: 'Fog', desc: 'Nevoeiro' }
  if ([51, 53, 55, 56, 57].includes(code)) return { condition: 'Rain', desc: 'Garoa/chuvisco' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { condition: 'Rain', desc: 'Chuva' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Snow', desc: 'Neve' }
  if ([95, 96, 99].includes(code)) return { condition: 'Thunderstorm', desc: 'Tempestade' }
  return { condition: 'Clouds', desc: 'Condição desconhecida' }
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city') ?? 'São Paulo'

  // 1) Geocoding (gratis, sem chave)
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=pt&format=json`
  const geoRes = await fetch(geoUrl, { next: { revalidate: 86400 } }) // 24h
  if (!geoRes.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: geoRes.status })
  const geo = await geoRes.json()
  const place = geo?.results?.[0]
  if (!place) return NextResponse.json({ error: 'City not found' }, { status: 404 })

  // 2) Previsão atual (gratis, sem chave)
  const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`
  const wxRes = await fetch(wxUrl, { next: { revalidate: 900 } }) // 15 min
  if (!wxRes.ok) return NextResponse.json({ error: 'Weather fetch failed' }, { status: wxRes.status })
  const wx = await wxRes.json()

  const temp = Math.round(wx?.current?.temperature_2m ?? NaN)
  const feels = Math.round(wx?.current?.apparent_temperature ?? NaN)
  const code = Number(wx?.current?.weather_code ?? 3)
  const { condition, desc } = codeToCondDesc(code)

  return NextResponse.json({
    city: `${place.name}${place.admin1 ? `, ${place.admin1}` : ''}`,
    temp,
    feelsLike: feels,
    condition,          // em inglês p/ bater com os ícones do WeatherBadge
    description: desc,  // em PT-BR para o tooltip
  })
});