"use client";

import type { Dispatch, SetStateAction } from "react";
import { Calendar, DollarSign, History, Mail, Phone, User, Users } from "lucide-react";

import { Button } from "@gladpros/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

type OrderTechnician = {
  workerId: number;
  addedAt: string;
  worker: { id: number; name: string; classification: string; usuario: { avatarUrl: string | null } | null };
};

type ServiceOrderSidebarProps = {
  actionLoading: boolean;
  editingSchedule: boolean;
  formatCurrency: (value: number) => string;
  getStatusLabel: (status: string) => string;
  history: Array<{
    id: number;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    createdAt: string;
    CreatedBy: { id: number; nomeCompleto: string } | null;
  }>;
  order: {
    AssignedWorker: { id: number; name: string; classification: string } | null;
    Invoice: { id: number; numeroInvoice: string; status: string; valorTotal: number } | null;
    attachments: Array<{ type: string; receiptTotal: number | null; taxAmount: number | null }>;
    clientNotes: string | null;
    endClientName: string | null;
    endClientPhone: string | null;
    endClientEmail: string | null;
    endClientNotes: string | null;
    estimatedHours: number | null;
    hourlyRate: number | null;
    laborTotal: number;
    materialTotal: number;
    materials: Array<{
      id: number;
      quantityPlanned: number;
      unitCostEstimated: number | null;
      unitCostActual: number | null;
    }>;
    scheduleDateEnd: string | null;
    scheduleDateStart: string | null;
    scheduleType: string;
    scheduledDate: string | null;
    status: string;
    techNotes: string | null;
  };
  orderTechnicians: OrderTechnician[];
  saveSchedule: () => void;
  scheduleForm: {
    scheduleType: "FIXED" | "FLEXIBLE";
    scheduledDate: string;
    scheduleDateStart: string;
    scheduleDateEnd: string;
  };
  setEditingSchedule: Dispatch<SetStateAction<boolean>>;
  setScheduleForm: Dispatch<
    SetStateAction<{
      scheduleType: "FIXED" | "FLEXIBLE";
      scheduledDate: string;
      scheduleDateStart: string;
      scheduleDateEnd: string;
    }>
  >;
  setShowTechAssign: Dispatch<SetStateAction<boolean>>;
  setShowTeamModal: Dispatch<SetStateAction<boolean>>;
};

export function ServiceOrderSidebar({
  actionLoading,
  editingSchedule,
  formatCurrency,
  getStatusLabel,
  history,
  order,
  orderTechnicians,
  saveSchedule,
  scheduleForm,
  setEditingSchedule,
  setScheduleForm,
  setShowTechAssign,
  setShowTeamModal,
}: ServiceOrderSidebarProps) {
  const estimatedLaborTotal = order.estimatedHours && order.hourlyRate
    ? Number(order.estimatedHours) * Number(order.hourlyRate)
    : 0;
  const estimatedMaterialTotal = order.materials.reduce((sum, material) => {
    const cost = material.unitCostEstimated || material.unitCostActual || 0;
    return sum + (Number(cost) * Number(material.quantityPlanned));
  }, 0);
  const actualTotal = Number(order.laborTotal) + Number(order.materialTotal);

  // Breakdown from receipt attachments
  const purchaseReceipts = order.attachments.filter(a => a.type === 'RECEIPT');
  const returnReceipts = order.attachments.filter(a => a.type === 'RETURN_RECEIPT');
  const purchaseSubtotal = purchaseReceipts.reduce((sum, a) => sum + Number(a.receiptTotal || 0), 0);
  const taxTotal = purchaseReceipts.reduce((sum, a) => sum + Number(a.taxAmount || 0), 0);
  const returnTotal = returnReceipts.reduce((sum, a) => sum + Number(a.receiptTotal || 0), 0);
  const returnTaxTotal = returnReceipts.reduce((sum, a) => sum + Number(a.taxAmount || 0), 0);
  const netReceiptCost = purchaseSubtotal + taxTotal - returnTotal - returnTaxTotal;

  const netCost = actualTotal - returnTotal;
  const effectiveTotal = netCost > 0 ? netCost : estimatedLaborTotal + estimatedMaterialTotal;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico ({history.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Sem eventos registrados</p>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {history.map((event) => (
                <div key={event.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {event.eventType === "STATUS_CHANGED"
                          ? "Status alterado"
                          : event.eventType === "CANCELED"
                            ? "Cancelada"
                            : event.eventType === "REOPENED"
                              ? "Reaberta"
                              : event.eventType}
                      </span>
                      {event.fromStatus && event.toStatus && (
                        <span className="text-muted-foreground">
                          {getStatusLabel(event.fromStatus)} → {getStatusLabel(event.toStatus)}
                        </span>
                      )}
                    </div>
                    {event.reason && <p className="mt-1 text-muted-foreground">&quot;{event.reason}&quot;</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" })}
                      {event.CreatedBy && ` • ${event.CreatedBy.nomeCompleto}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Estimativa</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mão de obra</span>
              <span className="font-medium">{estimatedLaborTotal > 0 ? formatCurrency(estimatedLaborTotal) : "-"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Materiais</span>
              <span className="font-medium">{estimatedMaterialTotal > 0 ? formatCurrency(estimatedMaterialTotal) : "-"}</span>
            </div>
            <div className="flex justify-between border-t border-dashed pt-1 text-sm font-medium">
              <span>Subtotal Est.</span>
              <span>{formatCurrency(estimatedLaborTotal + estimatedMaterialTotal)}</span>
            </div>
          </div>

          {actualTotal > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Realizado</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mão de obra</span>
                <span className="font-medium text-green-600">{formatCurrency(Number(order.laborTotal))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Materiais</span>
                <span className="font-medium text-green-600">{formatCurrency(Number(order.materialTotal))}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impostos s/ compras</span>
                  <span className="font-medium text-amber-500">+{formatCurrency(taxTotal)}</span>
                </div>
              )}
              {returnTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Devoluções</span>
                  <span className="font-medium text-red-500">-{formatCurrency(returnTotal)}</span>
                </div>
              )}
              {returnTaxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impostos s/ devol.</span>
                  <span className="font-medium text-red-400">-{formatCurrency(returnTaxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed pt-1 text-sm font-semibold">
                <span>Custo Líquido</span>
                <span className="text-foreground">{formatCurrency(netCost)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatCurrency(effectiveTotal)}</span>
          </div>

          {order.Invoice && (
            <div className="mt-4 rounded-lg bg-primary/10 border border-primary/20 p-3">
              <p className="text-sm font-medium">Fatura: {order.Invoice.numeroInvoice}</p>
              <p className="text-xs text-muted-foreground">Status: {order.Invoice.status}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt breakdown card — shown when there are receipts */}
      {(purchaseReceipts.length > 0 || returnReceipts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Notas Fiscais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {purchaseReceipts.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Compras ({purchaseReceipts.length} NF{purchaseReceipts.length > 1 ? 's' : ''})</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal materiais</span>
                  <span className="font-medium">{formatCurrency(purchaseSubtotal)}</span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impostos TX</span>
                    <span className="font-medium text-amber-500">+{formatCurrency(taxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-dashed pt-1">
                  <span>Total compras</span>
                  <span>{formatCurrency(purchaseSubtotal + taxTotal)}</span>
                </div>
              </div>
            )}
            {returnReceipts.length > 0 && (
              <div className="space-y-1 border-t pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Devoluções ({returnReceipts.length} NF{returnReceipts.length > 1 ? 's' : ''})</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor devolvido</span>
                  <span className="font-medium text-orange-500">-{formatCurrency(returnTotal)}</span>
                </div>
                {returnTaxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impostos recuperados</span>
                    <span className="font-medium text-orange-400">-{formatCurrency(returnTaxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-dashed pt-1">
                  <span>Total devoluções</span>
                  <span className="text-orange-500">-{formatCurrency(returnTotal + returnTaxTotal)}</span>
                </div>
              </div>
            )}
            {purchaseReceipts.length > 0 && returnReceipts.length > 0 && (
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Custo líquido NFs</span>
                <span className={netReceiptCost >= 0 ? 'text-foreground' : 'text-green-600'}>{formatCurrency(netReceiptCost)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe Técnica
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowTeamModal(true)}>
            Gerenciar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Responsável */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Responsável</p>
            <div className="flex items-center justify-between">
              {order.AssignedWorker ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.AssignedWorker.name}</p>
                    <p className="text-xs text-muted-foreground">{order.AssignedWorker.classification}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não atribuído</p>
              )}
              {["DRAFT", "SCHEDULED"].includes(order.status) && (
                <Button variant="ghost" size="sm" onClick={() => setShowTechAssign(true)}>
                  {order.AssignedWorker ? "Alterar" : "Atribuir"}
                </Button>
              )}
            </div>
          </div>

          {/* Equipe de suporte */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              Equipe ({orderTechnicians.length})
            </p>
            {orderTechnicians.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum membro na equipe</p>
            ) : (
              <div className="space-y-2">
                {orderTechnicians.map((t) => (
                  <div key={t.workerId} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {t.worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm leading-tight">{t.worker.name}</p>
                      <p className="text-xs text-muted-foreground">{t.worker.classification}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(order.endClientName || order.endClientPhone || order.endClientEmail || order.endClientNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Cliente Final / Contato no Local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.endClientName && (
              <p className="font-medium">{order.endClientName}</p>
            )}
            {order.endClientPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{order.endClientPhone}</span>
              </div>
            )}
            {order.endClientEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>{order.endClientEmail}</span>
              </div>
            )}
            {order.endClientNotes && (
              <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">
                {order.endClientNotes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamento
          </CardTitle>
          {!editingSchedule && ["DRAFT", "SCHEDULED"].includes(order.status) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setScheduleForm({
                  scheduleType: (order.scheduleType as "FIXED" | "FLEXIBLE") || "FIXED",
                  scheduledDate: order.scheduledDate ? new Date(order.scheduledDate).toISOString().slice(0, 16) : "",
                  scheduleDateStart: order.scheduleDateStart ? new Date(order.scheduleDateStart).toISOString().slice(0, 16) : "",
                  scheduleDateEnd: order.scheduleDateEnd ? new Date(order.scheduleDateEnd).toISOString().slice(0, 16) : "",
                });
                setEditingSchedule(true);
              }}
            >
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingSchedule ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase text-muted-foreground">Tipo</label>
                <div className="mt-2 flex gap-4">
                  {(["FIXED", "FLEXIBLE"] as const).map((type) => (
                    <label key={type} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value={type}
                        checked={scheduleForm.scheduleType === type}
                        onChange={() => setScheduleForm((current) => ({ ...current, scheduleType: type }))}
                      />
                      <span className="text-sm">{type === "FIXED" ? "Data Fixa" : "Janela Flexível"}</span>
                    </label>
                  ))}
                </div>
              </div>

              {scheduleForm.scheduleType === "FIXED" ? (
                <div>
                  <label className="text-xs font-medium uppercase text-muted-foreground">Data / Hora</label>
                  <input
                    type="datetime-local"
                    title="Data e hora do agendamento"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm((current) => ({ ...current, scheduledDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">A partir de</label>
                    <input
                      type="datetime-local"
                      title="Início da janela"
                      value={scheduleForm.scheduleDateStart}
                      onChange={(e) => setScheduleForm((current) => ({ ...current, scheduleDateStart: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase text-muted-foreground">Até</label>
                    <input
                      type="datetime-local"
                      title="Fim da janela"
                      value={scheduleForm.scheduleDateEnd}
                      onChange={(e) => setScheduleForm((current) => ({ ...current, scheduleDateEnd: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingSchedule(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={saveSchedule} disabled={actionLoading} className="flex-1">
                  {actionLoading ? "Salvando..." : "Salvar Agendamento"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {order.scheduledDate ? (
                <p className="font-medium">
                  {new Date(order.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Chicago",
                  })}
                </p>
              ) : order.scheduleDateStart && order.scheduleDateEnd ? (
                <p className="text-sm">
                  {new Date(order.scheduleDateStart).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })} - {new Date(order.scheduleDateEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Não agendado</p>
              )}

              {order.estimatedHours && (
                <p className="mt-2 text-sm text-muted-foreground">Estimativa: {order.estimatedHours}h</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {(order.techNotes || order.clientNotes) && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.techNotes && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notas Internas</label>
                <p className="text-sm">{order.techNotes}</p>
              </div>
            )}
            {order.clientNotes && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Notas para Cliente</label>
                <p className="text-sm">{order.clientNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
