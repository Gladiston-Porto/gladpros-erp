"use client";

import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import type { ServiceOrderClient, ServiceOrderFormState } from "./types";

type ServiceOrderClientSectionProps = {
  clients: ServiceOrderClient[];
  filteredClients: ServiceOrderClient[];
  form: ServiceOrderFormState;
  inputCls: string;
  labelCls: string;
  searchClient: string;
  selectedClient?: ServiceOrderClient;
  setForm: React.Dispatch<React.SetStateAction<ServiceOrderFormState>>;
  setSearchClient: React.Dispatch<React.SetStateAction<string>>;
};

export function ServiceOrderClientSection({
  clients,
  filteredClients,
  form,
  inputCls,
  labelCls,
  searchClient,
  selectedClient,
  setForm,
  setSearchClient,
}: ServiceOrderClientSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchClient}
            onChange={(event) => setSearchClient(event.target.value)}
            placeholder="Buscar cliente..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {searchClient && filteredClients.length > 0 && !selectedClient && (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-popover">
            {filteredClients.slice(0, 10).map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, clienteId: client.id }));
                  setSearchClient("");
                }}
                className="w-full px-4 py-2 text-left text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {client.name}
              </button>
            ))}
          </div>
        )}

        {selectedClient && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
            <span className="font-medium text-foreground">{selectedClient.name}</span>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, clienteId: 0 }))}
              className="text-sm text-destructive hover:underline"
            >
              Remover
            </button>
          </div>
        )}

        <div>
          <label className={labelCls}>Título do Serviço *</label>
          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            className={inputCls}
            placeholder="Ex: Instalação de ponto de energia"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sameAddress"
            checked={form.sameClientAddress}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sameClientAddress: event.target.checked,
              }))
            }
            className="h-4 w-4"
          />
          <label htmlFor="sameAddress" className="text-sm text-foreground">
            Usar endereço do cliente como local do serviço
          </label>
        </div>

        {!form.sameClientAddress && (
          <div className="space-y-4 border-t border-border pt-4">
            <div>
              <label className={labelCls}>Street Address</label>
              <input
                type="text"
                value={form.serviceAddressLine1}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serviceAddressLine1: event.target.value,
                  }))
                }
                className={inputCls}
                placeholder="123 Main St, Suite 100"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  title="City"
                  value={form.serviceCity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceCity: event.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="Dallas"
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input
                  type="text"
                  title="State (abbreviation)"
                  value={form.serviceState}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceState: event.target.value,
                    }))
                  }
                  className={inputCls}
                  maxLength={2}
                  placeholder="TX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>ZIP Code</label>
                <input
                  type="text"
                  title="ZIP Code"
                  value={form.serviceZip}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceZip: event.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="75201"
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  type="tel"
                  title="Contact phone"
                  value={form.servicePhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      servicePhone: event.target.value,
                    }))
                  }
                  className={inputCls}
                  placeholder="(214) 555-0100"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Contact Name</label>
              <input
                type="text"
                title="Contact name on site"
                value={form.serviceContactName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serviceContactName: event.target.value,
                  }))
                }
                className={inputCls}
                placeholder="Nome do contato no local"
              />
            </div>
          </div>
        )}

        {/* End Client / On-site Contact */}
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente Final / Contato no Local
          </p>
          <p className="text-xs text-muted-foreground -mt-1">
            Preencha quando o trabalho for executado para um cliente do seu cliente (ex: dono do imóvel contratado pela empreiteira)
          </p>
          <div>
            <label className={labelCls}>Nome do Cliente Final</label>
            <input
              type="text"
              title="Nome do cliente final ou proprietário"
              value={form.endClientName}
              onChange={(e) => setForm((c) => ({ ...c, endClientName: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Sarah Johnson (proprietária)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="tel"
                title="Telefone do cliente final"
                value={form.endClientPhone}
                onChange={(e) => setForm((c) => ({ ...c, endClientPhone: e.target.value }))}
                className={inputCls}
                placeholder="(954) 555-0100"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                title="Email do cliente final"
                value={form.endClientEmail}
                onChange={(e) => setForm((c) => ({ ...c, endClientEmail: e.target.value }))}
                className={inputCls}
                placeholder="sarah@email.com"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações de Acesso</label>
            <textarea
              title="Observações sobre acesso ao local"
              value={form.endClientNotes}
              onChange={(e) => setForm((c) => ({ ...c, endClientNotes: e.target.value }))}
              className={inputCls + " resize-none"}
              rows={2}
              placeholder="Ex: Acessar pelo portão lateral, ligar antes de chegar"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
