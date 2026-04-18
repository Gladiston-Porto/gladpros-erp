"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";

import type { ServiceOrderFormState } from "./types";

type ServiceOrderScheduleSectionProps = {
  form: ServiceOrderFormState;
  inputCls: string;
  labelCls: string;
  setForm: React.Dispatch<React.SetStateAction<ServiceOrderFormState>>;
};

export function ServiceOrderScheduleSection({
  form,
  inputCls,
  labelCls,
  setForm,
}: ServiceOrderScheduleSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className={labelCls}>Tipo de Agendamento</label>
          <div className="mt-2 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-foreground">
              <input
                type="radio"
                value="FIXED"
                checked={form.scheduleType === "FIXED"}
                onChange={() =>
                  setForm((current) => ({ ...current, scheduleType: "FIXED" }))
                }
                className="h-4 w-4"
              />
              Data fixa
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-foreground">
              <input
                type="radio"
                value="FLEXIBLE"
                checked={form.scheduleType === "FLEXIBLE"}
                onChange={() =>
                  setForm((current) => ({ ...current, scheduleType: "FLEXIBLE" }))
                }
                className="h-4 w-4"
              />
              Janela flexível
            </label>
          </div>
        </div>

        {form.scheduleType === "FIXED" && (
          <div>
            <label className={labelCls}>Data do Serviço</label>
            <input
              type="date"
              title="Data do serviço"
              value={form.scheduledDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scheduledDate: event.target.value,
                }))
              }
              className={inputCls}
            />
          </div>
        )}

        {form.scheduleType === "FLEXIBLE" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>De</label>
              <input
                type="date"
                title="Data início"
                value={form.scheduleDateStart}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduleDateStart: event.target.value,
                  }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Até</label>
              <input
                type="date"
                title="Data fim"
                value={form.scheduleDateEnd}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduleDateEnd: event.target.value,
                  }))
                }
                className={inputCls}
              />
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Prioridade</label>
          <select
            title="Prioridade da ordem de serviço"
            value={form.priority}
            onChange={(event) =>
              setForm((current) => ({ ...current, priority: event.target.value }))
            }
            className={inputCls}
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="EMERGENCY">Emergência</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
