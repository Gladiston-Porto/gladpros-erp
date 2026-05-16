"use client"

import { useState } from "react"

interface Props {
  onSuccess?: () => void
}

export default function PontoCorrectionForm({ onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    workDate: "",
    clockIn: "",
    clockOut: "",
    reason: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const clockInISO = `${form.workDate}T${form.clockIn}:00.000Z`
    const clockOutISO = `${form.workDate}T${form.clockOut}:00.000Z`

    try {
      const res = await fetch("/api/rh/time-entries/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: form.workDate,
          clockIn: clockInISO,
          clockOut: clockOutISO,
          reason: form.reason,
          workLocation: "ON_SITE",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Erro ao enviar correção")
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          setForm({ workDate: "", clockIn: "", clockOut: "", reason: "" })
          onSuccess?.()
        }, 2000)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/30 hover:bg-brand-secondary/20 transition-colors text-sm font-medium min-h-[48px]"
        aria-label="Solicitar correção de ponto"
      >
        ✏️ Solicitar Correção
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Solicitar Correção de Ponto</h2>
              <button
                onClick={() => { setOpen(false); setError(null); setSuccess(false) }}
                className="text-muted-foreground hover:text-foreground transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-foreground font-medium">Correção enviada!</p>
                <p className="text-muted-foreground text-sm text-center">
                  Aguardando aprovação do supervisor.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="correction-date">
                    Data do dia esquecido
                  </label>
                  <input
                    id="correction-date"
                    type="date"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    value={form.workDate}
                    onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[48px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-foreground" htmlFor="correction-clockin">
                      Entrada
                    </label>
                    <input
                      id="correction-clockin"
                      type="time"
                      required
                      value={form.clockIn}
                      onChange={(e) => setForm({ ...form, clockIn: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[48px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-foreground" htmlFor="correction-clockout">
                      Saída
                    </label>
                    <input
                      id="correction-clockout"
                      type="time"
                      required
                      value={form.clockOut}
                      onChange={(e) => setForm({ ...form, clockOut: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[48px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="correction-reason">
                    Motivo da correção
                  </label>
                  <textarea
                    id="correction-reason"
                    required
                    minLength={5}
                    maxLength={500}
                    rows={3}
                    placeholder="Ex: Esqueci de registrar pois estava sem celular..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none text-sm"
                  />
                  <span className="text-xs text-muted-foreground text-right">{form.reason.length}/500</span>
                </div>

                {error && (
                  <div className="px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null) }}
                    className="flex-1 px-4 py-2 rounded-2xl border border-border text-muted-foreground hover:bg-muted/50 transition-colors text-sm min-h-[48px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50 transition-colors text-sm font-medium min-h-[48px]"
                    aria-label="Enviar correção"
                  >
                    {loading ? "Enviando..." : "Enviar Correção"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
