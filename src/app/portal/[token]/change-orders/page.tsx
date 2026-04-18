import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { resolvePortalChangeOrdersListView } from "@/domains/portal/services/PortalChangeOrdersPageResolver";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PortalChangeOrdersPage({ params }: Props) {
  noStore();

  const [{ token }, headerStore] = await Promise.all([params, headers()]);
  const ip = getClientIp(headerStore);
  const resolved = await resolvePortalChangeOrdersListView(token, ip);

  if (!resolved) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <h1 className="text-xl font-semibold">Change Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visualização read-only para cliente.</p>
      </header>

      {resolved.changeOrders.length === 0 ? (
        <section className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-sm text-muted-foreground">Nenhum change order disponível no momento.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {resolved.changeOrders.map((changeOrder) => (
            <li key={changeOrder.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{changeOrder.title}</h2>
                <span className="text-xs font-medium uppercase text-muted-foreground">{changeOrder.status}</span>
              </div>
              {changeOrder.summary ? (
                <p className="mt-2 text-sm text-muted-foreground">{changeOrder.summary}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Criado em {new Date(changeOrder.createdAt).toLocaleDateString("pt-BR")}</span>
                <span>Atualizado em {new Date(changeOrder.updatedAt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="mt-4">
                <Link
                  href={`/portal/${token}/change-orders/${changeOrder.id}`}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  Ver detalhes
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
