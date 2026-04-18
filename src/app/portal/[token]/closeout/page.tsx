import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { resolvePortalCloseoutView } from "@/domains/portal/resolvers/PortalCloseoutPageResolver";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

function getCloseoutStatusLabel(status: string): string {
  const normalized = status.toUpperCase();

  if (normalized === "PENDING_ITEMS") return "Pendente";
  if (normalized === "READY") return "Pronto";
  if (normalized === "GENERATED") return "Gerado";
  if (normalized === "DELIVERED") return "Entregue";
  if (normalized === "ACCEPTED") return "Aceito";

  return status;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default async function PortalCloseoutPage({ params }: Props) {
  noStore();

  const [{ token }, headerStore] = await Promise.all([params, headers()]);
  const ip = getClientIp(headerStore);
  const resolved = await resolvePortalCloseoutView(token, ip);

  if (!resolved) {
    notFound();
  }

  const { closeout } = resolved;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Closeout Package</h1>
          <span className="rounded-full border px-2 py-1 text-xs font-medium text-muted-foreground">
            {getCloseoutStatusLabel(closeout.status)}
          </span>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Detalhes</h2>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Status:</span> {getCloseoutStatusLabel(closeout.status)}
          </p>
          <p>
            <span className="font-medium">Gerado em:</span> {formatDate(closeout.generatedAt)}
          </p>
          <p>
            <span className="font-medium">Entregue em:</span> {formatDate(closeout.deliveredAt)}
          </p>
          <p>
            <span className="font-medium">Aceito em:</span> {formatDate(closeout.acceptedAt)}
          </p>
        </div>

        {closeout.downloadAvailable ? (
          <div className="mt-4 border-t pt-4">
            <Link
              href={`/portal/${encodeURIComponent(token)}/closeout/pdf`}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Baixar Closeout
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-6">
        <Link
          href={`/portal/${encodeURIComponent(token)}`}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Voltar ao Portal
        </Link>
      </div>
    </main>
  );
}
