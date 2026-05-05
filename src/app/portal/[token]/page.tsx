import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import Image from "next/image";
import { resolvePortalView } from "@/domains/portal/services/PortalPageResolver";
import { getClientIp } from "@/domains/portal/security/get-client-ip";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PortalProjectPage({ params }: Props) {
  noStore();

  const [{ token }, headerStore] = await Promise.all([params, headers()]);
  const ip = getClientIp(headerStore);

  const resolved = await resolvePortalView(token, ip);

  if (!resolved) {
    notFound();
  }

  const { project } = resolved;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <div className="flex items-center justify-between gap-4">
          <Image src="/images/LOGO_200.png" alt="GladPros" width={160} height={40} className="h-10 w-auto" />
          <span className="text-sm font-medium">Portal do Cliente</span>
        </div>
      </header>

      <section className="mb-6 rounded-lg border bg-card p-4 text-card-foreground">
        <h1 className="text-xl font-semibold">{project.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Projeto {project.numeroProjeto}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{project.status.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Início previsto</p>
            <p className="font-medium">{project.dataInicioPrevista ? new Date(project.dataInicioPrevista).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Conclusão prevista</p>
            <p className="font-medium">{project.dataConclusaoPrevista ? new Date(project.dataConclusaoPrevista).toLocaleDateString("pt-BR") : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="font-medium">{project.completionPercent}%</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 text-card-foreground">
        <h2 className="mb-3 text-lg font-semibold">Etapas do projeto</h2>
        {project.etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma etapa disponível no momento.</p>
        ) : (
          <ul className="space-y-2">
            {project.etapas.map((etapa) => (
              <li key={etapa.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{etapa.ordem}. {etapa.servico}</p>
                  <span className="text-sm text-muted-foreground capitalize">{etapa.status.replace(/_/g, " ")}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Progresso: {etapa.porcentagem}%</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
