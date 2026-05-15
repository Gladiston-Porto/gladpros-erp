"use client"

// PontoWorkerView — tela mobile-first para o worker registrar ponto
// GPS capturado automaticamente via navigator.geolocation

import { useState, useEffect, useCallback } from "react"
import { MapPin, Clock, Play, Square, AlertTriangle, CheckCircle } from "lucide-react"

interface User {
  id: number
  role: string
  email: string
}

interface TimeEntry {
  id: number
  clockIn: string
  totalMinutes?: number
  regularMinutes?: number
  overtimeMinutes?: number
  status: string
}

interface CurrentEntryResponse {
  data: (TimeEntry & {
    elapsed: { minutes: number; hours: string; isOvertime: boolean }
  }) | null
  success: boolean
}

export default function PontoWorkerView({ user }: { user: User }) {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [isOvertime, setIsOvertime] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [lastClockOut, setLastClockOut] = useState<TimeEntry | null>(null)

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/rh/time-entries/current")
      const data: CurrentEntryResponse = await res.json()
      if (data.success && data.data) {
        setCurrentEntry(data.data)
        setElapsedMinutes(data.data.elapsed.minutes)
        setIsOvertime(data.data.elapsed.isOvertime)
      } else {
        setCurrentEntry(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrent()
  }, [fetchCurrent])

  // Atualiza timer a cada minuto
  useEffect(() => {
    if (!currentEntry) return
    const interval = setInterval(() => {
      const clockIn = new Date(currentEntry.clockIn)
      const minutes = Math.round((Date.now() - clockIn.getTime()) / 60000)
      setElapsedMinutes(minutes)
      setIsOvertime(minutes > 480)
    }, 60000)
    return () => clearInterval(interval)
  }, [currentEntry])

  async function getLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationError("GPS não disponível neste dispositivo")
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationError(null)
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setLocationError("Não foi possível obter sua localização. Verifique as permissões.")
          resolve(null)
        },
        { timeout: 10000, enableHighAccuracy: true }
      )
    })
  }

  async function handleClockIn() {
    setActionLoading(true)
    setMessage(null)

    const location = await getLocation()
    if (!location) {
      setActionLoading(false)
      return
    }

    try {
      const res = await fetch("/api/rh/time-entries/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      })
      const data = await res.json()

      if (data.success) {
        setMessage({ type: "success", text: "✅ Turno iniciado com sucesso!" })
        await fetchCurrent()
      } else {
        setMessage({ type: "error", text: data.message ?? "Erro ao iniciar turno" })
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexão. Tente novamente." })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClockOut() {
    if (!currentEntry) return
    setActionLoading(true)
    setMessage(null)

    const location = await getLocation()

    try {
      const body: Record<string, unknown> = {}
      if (location) {
        body.lat = location.lat
        body.lng = location.lng
      }

      const res = await fetch(`/api/rh/time-entries/${currentEntry.id}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setLastClockOut(data.data)
        setCurrentEntry(null)
        setElapsedMinutes(0)
        setIsOvertime(false)
        setMessage({ type: "success", text: "✅ Turno encerrado!" })
      } else {
        setMessage({ type: "error", text: data.message ?? "Erro ao encerrar turno" })
      }
    } catch {
      setMessage({ type: "error", text: "Erro de conexão. Tente novamente." })
    } finally {
      setActionLoading(false)
    }
  }

  const formatElapsed = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-hero-gradient px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <Clock className="w-6 h-6 text-white" />
          <h1 className="font-title text-xl text-white font-bold">Ponto Eletrônico</h1>
        </div>
        <p className="text-white/70 text-sm">{user.email}</p>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-4 max-w-sm mx-auto w-full">

        {/* Mensagem de feedback */}
        {message && (
          <div
            className={`rounded-2xl p-4 flex items-center gap-3 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : message.type === "error"
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
            }`}
          >
            {message.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* GPS error */}
        {locationError && (
          <div className="rounded-2xl p-4 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center gap-3 text-sm">
            <MapPin className="w-5 h-5 shrink-0" />
            {locationError}
          </div>
        )}

        {/* Card principal */}
        {currentEntry ? (
          /* Turno aberto */
          <div className={`rounded-2xl p-6 border ${isOvertime ? "bg-red-500/5 border-red-500/30" : "bg-card border-border"}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isOvertime ? "bg-red-500" : "bg-green-500"}`} />
              <span className={`text-sm font-semibold ${isOvertime ? "text-red-500" : "text-green-500"}`}>
                {isOvertime ? "Em horas extras" : "Turno em andamento"}
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-foreground mb-2">{formatElapsed(elapsedMinutes)}</div>
              <div className="text-sm text-muted-foreground">
                Entrada: {formatTime(currentEntry.clockIn)}
              </div>
              {isOvertime && (
                <div className="text-xs text-red-500 mt-1">
                  ⚡ {formatElapsed(elapsedMinutes - 480)} em extras
                </div>
              )}
            </div>

            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              aria-label="Encerrar turno"
              className="w-full h-16 rounded-2xl bg-destructive text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Square className="w-6 h-6" />
                  Encerrar Turno
                </>
              )}
            </button>
          </div>
        ) : (
          /* Sem turno aberto */
          <div className="rounded-2xl p-6 bg-card border border-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Sem turno ativo</span>
            </div>

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⏰</div>
              <p className="text-sm text-muted-foreground">
                Toque em <strong>Iniciar Turno</strong> para registrar sua entrada.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Sua localização será capturada automaticamente.
              </p>
            </div>

            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              aria-label="Iniciar turno"
              className="w-full h-16 rounded-2xl bg-brand-primary text-white font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {actionLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Iniciar Turno
                </>
              )}
            </button>
          </div>
        )}

        {/* Resumo do último turno */}
        {lastClockOut && (
          <div className="rounded-2xl p-4 bg-card border border-border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Último turno</p>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Total trabalhado</span>
              <span className="font-semibold text-foreground">{formatElapsed(lastClockOut.totalMinutes ?? 0)}</span>
            </div>
            {(lastClockOut.overtimeMinutes ?? 0) > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Horas extras</span>
                <span className="font-semibold text-yellow-600">{formatElapsed(lastClockOut.overtimeMinutes ?? 0)}</span>
              </div>
            )}
          </div>
        )}

        {/* Telegram CTA */}
        <div className="rounded-2xl p-4 bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
              <span className="text-lg">✈️</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Também pelo Telegram</p>
              <p className="text-xs text-muted-foreground">Use /clockin pelo bot para registrar sem abrir o sistema</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
