import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getClientIp } from "@/domains/portal/security/get-client-ip";
import { resolvePortalInvoiceDetailView } from "@/domains/portal/resolvers/PortalInvoicesPageResolver";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
    id: string;
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

export default async function PortalInvoiceDetailPage({ params }: Props) {
  noStore();

  const [{ token, id }, headerStore] = await Promise.all([params, headers()]);
  const invoiceId = Number(id);
  const ip = getClientIp(headerStore);

  const resolved = await resolvePortalInvoiceDetailView(token, invoiceId, ip);
  if (!resolved) {
    notFound();
  }

  const { invoice } = resolved;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{invoice.invoiceNumber}</h1>
          <span className="rounded-full border px-2 py-1 text-xs font-medium text-muted-foreground">
            {getInvoiceStatusLabel(invoice.status)}
          </span>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Detalhes da invoice</h2>

        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Número:</span> {invoice.invoiceNumber}
          </p>
          <p>
            <span className="font-medium">Emissão:</span> {new Date(invoice.issuedAt).toLocaleDateString("pt-BR")}
          </p>
          <p>
            <span className="font-medium">Vencimento:</span> {new Date(invoice.dueAt).toLocaleDateString("pt-BR")}
          </p>
          <p>
            <span className="font-medium">Total:</span> {formatCurrency(invoice.total, invoice.currency)}
          </p>
          <p>
            <span className="font-medium">Pago:</span> {formatCurrency(invoice.amountPaid, invoice.currency)}
          </p>
          <p>
            <span className="font-medium">Saldo:</span> {formatCurrency(invoice.balanceDue, invoice.currency)}
          </p>
        </div>

        {invoice.pdfAvailable ? (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium">PDF</p>
            <Link
              href={`/portal/${encodeURIComponent(token)}/invoices/${encodeURIComponent(String(invoice.id))}/pdf`}
              className="mt-2 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Baixar PDF
            </Link>
          </div>
        ) : null}
      </section>

      <div className="mt-6">
        <Link href={`/portal/${token}/invoices`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
          Voltar para Invoices
        </Link>
      </div>
    </main>
  );
}
