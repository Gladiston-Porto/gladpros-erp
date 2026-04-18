"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type DecisionStatus = "PENDING" | "APPROVED" | "REJECTED";
type DecisionAction = "APPROVE" | "REJECT";
const NEUTRAL_ERROR_MESSAGE = "Não foi possível concluir. Tente novamente.";

type Props = {
  token: string;
  changeOrderId: string;
  initialStatus?: DecisionStatus;
  decidedAt?: string | null;
  decidedBy?: string | null;
};

function normalizeInitialStatus(status?: DecisionStatus): DecisionStatus {
  if (status === "APPROVED" || status === "REJECTED") {
    return status;
  }

  return "PENDING";
}

function toLocaleDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("pt-BR");
}

function normalizeNameInput(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export default function DecisionForm({ token, changeOrderId, initialStatus, decidedAt, decidedBy }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorNeutral, setErrorNeutral] = useState<string | null>(null);
  const [doneStatus, setDoneStatus] = useState<DecisionStatus>(normalizeInitialStatus(initialStatus));
  const [doneAt, setDoneAt] = useState<string | null>(decidedAt ?? null);
  const [doneBy, setDoneBy] = useState<string | null>(decidedBy ?? null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const isSubmittingRef = useRef(false);
  const shouldFocusStatusRef = useRef(false);

  const normalizedName = useMemo(() => normalizeNameInput(name), [name]);
  const canSubmit = normalizedName.length >= 2 && normalizedName.length <= 100 && !loading && doneStatus === "PENDING";

  function setNeutralError() {
    setErrorNeutral(NEUTRAL_ERROR_MESSAGE);
  }

  useEffect(() => {
    if (doneStatus !== "PENDING" && shouldFocusStatusRef.current) {
      statusRef.current?.focus();
      shouldFocusStatusRef.current = false;
    }
  }, [doneStatus]);

  async function submitDecision(action: DecisionAction) {
    if (isSubmittingRef.current) {
      return;
    }

    if (!canSubmit) {
      setErrorNeutral("Preencha seu nome com pelo menos 2 caracteres.");
      return;
    }

    isSubmittingRef.current = true;
    shouldFocusStatusRef.current = true;
    setLoading(true);
    setErrorNeutral(null);

    try {
      const safeToken = encodeURIComponent(token);
      const safeId = encodeURIComponent(String(changeOrderId));
      const url = `/portal/${safeToken}/change-orders/${safeId}/decision`;

      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
        keepalive: false,
        body: JSON.stringify({
          action,
          name: normalizedName,
        }),
      });

      if (!response.ok) {
        setNeutralError();
        return;
      }

      const payload = (await response.json()) as {
        status?: string;
        decidedAt?: string;
        decidedBy?: string;
      };

      const nextStatus = payload.status === "approved" ? "APPROVED" : payload.status === "rejected" ? "REJECTED" : null;

      if (!nextStatus) {
        setNeutralError();
        return;
      }

      setDoneStatus(nextStatus);
      setDoneAt(payload.decidedAt ?? new Date().toISOString());
      setDoneBy(payload.decidedBy ?? normalizedName);
    } catch {
      setNeutralError();
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  function onRejectClick() {
    if (isSubmittingRef.current) {
      return;
    }

    const confirmed = window.confirm("Tem certeza que deseja rejeitar esta mudança?");
    if (!confirmed) {
      return;
    }

    void submitDecision("REJECT");
  }

  const doneAtLabel = toLocaleDateTime(doneAt);

  return (
    <section className="mt-6 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">Decisão do cliente</h2>

      {doneStatus !== "PENDING" ? (
        <div ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="mt-3 space-y-1 text-sm">
          <p>
            <span className="font-medium">Status:</span> {doneStatus === "APPROVED" ? "Aprovado" : "Rejeitado"}
          </p>
          {doneAtLabel ? (
            <p>
              <span className="font-medium">Decidido em:</span> {doneAtLabel}
            </p>
          ) : null}
          {doneBy ? (
            <p>
              <span className="font-medium">Por:</span> {doneBy}
            </p>
          ) : null}
        </div>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={onSubmit}>
          <p className="text-xs text-muted-foreground">Esta ação registra seu nome e data/hora para auditoria.</p>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor={`decision-name-${changeOrderId}`}>
              Seu nome
            </label>
            <input
              id={`decision-name-${changeOrderId}`}
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading}
              maxLength={100}
              autoComplete="name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => submitDecision("APPROVE")}
              disabled={!canSubmit}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Aprovar"}
            </button>
            <button
              type="button"
              onClick={onRejectClick}
              disabled={!canSubmit}
              className="rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Rejeitar"}
            </button>
          </div>

          {errorNeutral ? (
            <p role="alert" aria-live="assertive" className="text-sm text-destructive">
              {errorNeutral}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
