"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Save, RotateCcw } from "lucide-react";
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader } from "@gladpros/ui/card"
import { ModulePageHeader } from "@gladpros/ui/module-page-header"
import { useToast } from "@gladpros/ui/toast";
import {
  CLIENTES_CONFIG_STORAGE_KEY,
  DEFAULT_CLIENTE_MODULE_CONFIG,
  type ClienteModuleConfig,
} from "@/shared/lib/clientes-config";

export default function ConfigClientesClientPage() {
  const toast = useToast();
  const [config, setConfig] = useState<ClienteModuleConfig>(DEFAULT_CLIENTE_MODULE_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLIENTES_CONFIG_STORAGE_KEY);
      if (raw) setConfig({ ...DEFAULT_CLIENTE_MODULE_CONFIG, ...JSON.parse(raw) });
    } catch {
      // ignora erro de parse
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(CLIENTES_CONFIG_STORAGE_KEY, JSON.stringify(config));
      setSaved(true);
      toast.success("Configurações salvas", "Suas preferências foram aplicadas.");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Erro", "Não foi possível salvar as configurações.");
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CLIENTE_MODULE_CONFIG);
    localStorage.removeItem(CLIENTES_CONFIG_STORAGE_KEY);
    toast.info("Restaurado", "Configurações voltaram ao padrão.");
  };

  const set = <K extends keyof ClienteModuleConfig>(key: K, value: ClienteModuleConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Configurações de Clientes"
        description="Personalize a exibição e o comportamento padrão da lista de clientes"
        icon={<Settings />}
        accentColor="#FF8C00"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clientes", href: "/clientes" },
          { label: "Configurações" },
        ]}
        actions={
          <Button variant="outline" size="default" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Listagem Padrão</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Filtros e paginação aplicados ao abrir a lista</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Registros por página</label>
              <select
                aria-label="Registros por página"
                value={config.defaultPageSize}
                onChange={(e) => set("defaultPageSize", Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-brand-primary"
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo padrão</label>
              <select
                aria-label="Tipo padrão"
                value={config.defaultTipo}
                onChange={(e) => set("defaultTipo", e.target.value as ClienteModuleConfig["defaultTipo"])}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-brand-primary"
              >
                <option value="all">Todos</option>
                <option value="PF">Pessoa Física</option>
                <option value="PJ">Pessoa Jurídica</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Status padrão</label>
              <select
                aria-label="Status padrão"
                value={config.defaultStatus}
                onChange={(e) => set("defaultStatus", e.target.value as ClienteModuleConfig["defaultStatus"])}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-brand-primary"
              >
                <option value="all">Todos os status</option>
                <option value="true">Somente Ativos</option>
                <option value="false">Somente Inativos</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-3">
            <h3 className="font-title text-base font-semibold text-foreground">Ordenação e Colunas</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Como a tabela é organizada por padrão</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Ordenar por</label>
              <select
                aria-label="Ordenar por"
                value={config.defaultSortKey}
                onChange={(e) => set("defaultSortKey", e.target.value as ClienteModuleConfig["defaultSortKey"])}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-brand-primary"
              >
                <option value="nome">Nome / Razão Social</option>
                <option value="criadoEm">Data de Cadastro</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Direção</label>
              <select
                aria-label="Direção de ordenação"
                value={config.defaultSortDir}
                onChange={(e) => set("defaultSortDir", e.target.value as "asc" | "desc")}
                className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground outline-none transition focus:border-brand-primary"
              >
                <option value="asc">A → Z / Mais antigo</option>
                <option value="desc">Z → A / Mais recente</option>
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <label className="block text-sm font-medium text-foreground">Colunas visíveis</label>
              {[
                { key: "showDocumentoColumn" as const, label: "Coluna Documento (SSN/EIN mascarado)" },
                { key: "showEnderecoColumn" as const, label: "Coluna Cidade/Estado" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded accent-brand-primary"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" onClick={handleSave} disabled={saved}>
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Salvo!" : "Salvar Preferências"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar Padrões
        </Button>
      </div>
    </div>
  );
}
