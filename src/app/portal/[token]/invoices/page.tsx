import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { resolvePortalInvoicesListView } from "@/domains/portal/resolvers/PortalInvoicesPageResolver";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getInvoiceStatusLabel(status: string): string {
  const normalized = status.toUpperCase();

  if (normalized === "DRAFT") return "Rascunho";
  if (normalized === "SENT") return "Enviada";
  if (normalized === "VIEWED") return "Visualizada";
  if (normalized === "PARTIAL_PAID") return "Parcialmente paga";
  if (normalized === "PAID") return "Paga";
  if (normalized === "OVERDUE") return "Vencida";
  if (normalized === "CANCELLED") return "Cancelada";

  return status;
}

export default async function PortalInvoicesPage({ params }: Props) {
  noStore();

  const [{ token }, headerStore] = await Promise.all([params, headers()]);
  const ip = getClientIp(headerStore);
  const resolved = await resolvePortalInvoicesListView(token, ip);

  if (!resolved) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visualização read-only para cliente.</p>
      </header>

      {resolved.invoices.length === 0 ? (
        <section className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-sm text-muted-foreground">Nenhuma invoice disponível no momento.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {resolved.invoices.map((invoice) => (
            <li key={invoice.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">{invoice.invoiceNumber}</h2>
                <span className="rounded-full border px-2 py-1 text-xs font-medium text-muted-foreground">
                  {getInvoiceStatusLabel(invoice.status)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Emissão: {new Date(invoice.issuedAt).toLocaleDateString("pt-BR")}</span>
                <span>Vencimento: {new Date(invoice.dueAt).toLocaleDateString("pt-BR")}</span>
              </div>

              <p className="mt-2 text-sm font-medium">Total: {formatCurrency(invoice.total, invoice.currency)}</p>

              <div className="mt-4">
                <Link
                  href={`/portal/${token}/invoices/${invoice.id}`}
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
