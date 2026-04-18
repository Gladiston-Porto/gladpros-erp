import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { resolvePortalChangeOrderDetailView } from "@/domains/portal/services/PortalChangeOrdersPageResolver";
import DecisionForm from "./_components/DecisionForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
    id: string;
  }>;
};

export default async function PortalChangeOrderDetailPage({ params }: Props) {
  noStore();

  const [{ token, id }, headerStore] = await Promise.all([params, headers()]);
  const changeOrderId = Number(id);
  const ip = getClientIp(headerStore);

  const resolved = await resolvePortalChangeOrderDetailView(token, changeOrderId, ip);

  if (!resolved) {
    notFound();
  }

  const { changeOrder } = resolved;
  const initialDecisionStatus =
    changeOrder.status === "APPROVED" ? "APPROVED" : changeOrder.status === "REJECTED" ? "REJECTED" : "PENDING";

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{changeOrder.title}</h1>
          <span className="text-xs font-medium uppercase text-muted-foreground">{changeOrder.status}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Change Order #{changeOrder.id}</p>
        <p className="mt-2 text-sm">{changeOrder.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Criado em {new Date(changeOrder.createdAt).toLocaleDateString("pt-BR")}</span>
          <span>Atualizado em {new Date(changeOrder.updatedAt).toLocaleDateString("pt-BR")}</span>
          {typeof changeOrder.scheduleImpactDays === "number" ? (
            <span>Impacto de prazo: {changeOrder.scheduleImpactDays} dias</span>
          ) : null}
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Mudanças de escopo</h2>
        {changeOrder.scopeChanges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem linhas de mudança de escopo.</p>
        ) : (
          <ul className="space-y-2">
            {changeOrder.scopeChanges.map((line) => (
              <li key={line.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{line.description}</p>
                  <span className="text-xs font-medium uppercase text-muted-foreground">{line.type}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Quantidade: {line.qty}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DecisionForm
        token={token}
        changeOrderId={String(changeOrder.id)}
        initialStatus={initialDecisionStatus}
        decidedAt={changeOrder.decidedAt ? changeOrder.decidedAt.toISOString() : null}
        decidedBy={changeOrder.decidedBy}
      />

      <div className="mt-6">
        <Link
          href={`/portal/${token}/change-orders`}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          Voltar para Change Orders
        </Link>
      </div>
    </main>
  );
}
