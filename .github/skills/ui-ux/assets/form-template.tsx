// @ts-nocheck
/**
 * GladPros — Form Template
 *
 * Copy and adapt this template for new forms.
 * Replace: FormSchema fields, MODULE_KEY, form fields JSX
 *
 * Features:
 * - react-hook-form + Zod validation
 * - @gladpros/ui form components
 * - Inline validation errors
 * - Loading state on submit
 * - RBAC permission check
 */

"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gladpros/ui"
import { can, type Role } from "@/shared/lib/rbac-core"

// -- Zod Schema --
const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

type FormData = z.infer<typeof formSchema>

interface FormProps {
  userRole: string
  initialData?: Partial<FormData>
  itemId?: number // for edit mode
}

export default function ModuleForm({ userRole, initialData, itemId }: FormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(itemId)

  // RBAC: check create/update permission
  const canSubmit = isEdit
    ? can(userRole as Role, "clientes", "update")
    : can(userRole as Role, "clientes", "create")

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      phone: initialData?.phone ?? "",
      notes: initialData?.notes ?? "",
      status: initialData?.status ?? "ACTIVE",
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const url = isEdit ? `/api/module/${itemId}` : "/api/module"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao salvar")
      }

      router.push("/module")
      router.refresh()
    } catch (error) {
      // Handle error (toast, etc.)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="font-title font-display">
            {isEdit ? "Editar" : "Novo"} Item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* -- Section 1: Basic Info -- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register("name")}
                aria-label="Nome"
                aria-invalid={!!errors.name}
                className="rounded-2xl"
              />
              {errors.name && (
                <p className="text-sm text-error">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                aria-label="Email"
                aria-invalid={!!errors.email}
                className="rounded-2xl"
              />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                {...register("phone")}
                aria-label="Telefone"
                placeholder="(XXX) XXX-XXXX"
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                defaultValue={initialData?.status ?? "ACTIVE"}
                onValueChange={(val) => setValue("status", val as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger id="status" aria-label="Status" className="rounded-2xl">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* -- Section 2: Additional -- */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              aria-label="Observações"
              rows={4}
              className="rounded-2xl"
            />
          </div>

          {/* -- Actions -- */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-2xl min-h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-2xl min-h-12"
            >
              {isSubmitting ? "Salvando..." : isEdit ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
