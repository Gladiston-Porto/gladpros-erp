"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "pwd_alert_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PasswordExpiryBanner() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [dias, setDias] = useState<number | null>(null);

  useEffect(() => {
    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_TTL_MS) return;
    } catch {
      // localStorage not available — skip
    }

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.passwordAlerta) {
          setDias(data.diasSemAlteracao ?? null);
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShow(false);
  };

  if (!show) return null;

  const msg =
    dias !== null
      ? `Sua senha está há ${dias} dia${dias !== 1 ? "s" : ""} sem alteração.`
      : "Você nunca alterou sua senha.";

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {msg} Recomendamos atualizar sua senha para manter a segurança da conta.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => router.push("/perfil")}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:brightness-110"
          aria-label="Alterar senha agora"
        >
          Alterar agora
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
          aria-label="Dispensar alerta de senha"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
