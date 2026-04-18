'use client'

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from 'next/navigation'
import { StatusProposta, StatusPropostaValues, StatusPermite, StatusPermiteValues } from '@/shared/types/prisma-temp';
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { Textarea } from "@gladpros/ui/textarea"
import { useToast } from "@gladpros/ui/toast";
import { useClientes } from './ClientesContext'
/* Removing ui-components imports */
/*
import {
    gp,
    Label,
    Input,
    Textarea,
    Select,
    Section,
    Badge,
    currency
} from './ui-components'
*/
// Re-implement currency helper locally or import if available. 
// I'll keep it simple locally for now.
const currency = (n: number | undefined) => {
    if (n == null || Number.isNaN(n)) return "-";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

import {
    Material,
    Etapa,
    PropostaFormData,
    ClienteInfo,
    PrazosInfo,
    ComerciaisInfo,
    InternoInfo,
    FaturamentoInfo
} from './types'
import { useCalcularTotais } from './hooks'
import { useAutoSave } from './useAutoSave'
import { propostaFormSchema } from './validation'
import { colors } from "@gladpros/ui/tokens"; // Import tokens correctly

interface PropostaFormProps {
    initialData?: PropostaFormData;
    propostaId?: string;
}

export default function PropostaForm({ initialData, propostaId }: PropostaFormProps) {
    const [loading, setLoading] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [status, setStatus] = useState<StatusProposta>(initialData?.status || StatusPropostaValues.RASCUNHO)
    const router = useRouter()
    const { addToast: showToast } = useToast()

    // Usar o contexto de clientes
    const { clientes, loading: clientesLoading, error: clientesError } = useClientes()

    // Estados do formulário
    const [cliente, setCliente] = useState<ClienteInfo>(initialData?.cliente || {
        id: "",
        contato_nome: "",
        contato_email: "",
        contato_telefone: "",
        local_endereco: "",
        titulo: "",
    })

    const [escopo, setEscopo] = useState(initialData?.escopo || "")

    const [prazos, setPrazos] = useState<PrazosInfo>(initialData?.prazos || {
        tempo_para_aceite: 7,
        validade_proposta: "",
        prazo_execucao_dias: 5,
        janela: "",
        restricoes: "",
    })

    const [permite, setPermite] = useState<StatusPermite>(initialData?.permite || StatusPermiteValues.NAO_NECESSARIO)
    const [quaisPermites, setQuaisPermites] = useState(initialData?.quaisPermites || "")
    const [normas, setNormas] = useState(initialData?.normas || "")
    const [inspecoes, setInspecoes] = useState(initialData?.inspecoes || "")

    const [comerciais, setComerciais] = useState<ComerciaisInfo>(initialData?.comerciais || {
        condicoes_pagamento: "40% na aprovação, 40% após etapa X, 20% na entrega",
        garantia: "12 meses mão de obra; 3 meses materiais",
        exclusoes: "Demolições estruturais, pintura externa, taxas municipais",
        condicoes_gerais: "Serviços conforme normas; atrasos por clima não imputáveis; SLA 48h.",
        desconto: 0,
    })

    const [interno, setInterno] = useState<InternoInfo>(initialData?.interno || {
        custo_material: 0,
        custo_mo: 0,
        horas_mo: 0,
        custo_terceiros: 0,
        overhead_pct: 12,
        margem_pct: 20,
        impostos_pct: 0,
        contingencia_pct: 0,
        frete: 0,
    })

    const [materiais, setMateriais] = useState<Material[]>(initialData?.materiais || [
        {
            id: crypto.randomUUID(),
            codigo: "CABO-14AWG",
            nome: "Cabo 14 AWG",
            quantidade: 120,
            unidade: "m",
            preco: 0.35,
            status: "necessario"
        },
    ])

    const [etapas, setEtapas] = useState<Etapa[]>(initialData?.etapas || [
        {
            id: crypto.randomUUID(),
            servico: "Instalação de QDC",
            descricao: "Montagem e organização de circuitos.",
            quantidade: 1,
            unidade: "serviço",
            duracaoHoras: 8,
            custoMO: 250,
            status: "planejada"
        },
    ])

    const [faturamento, setFaturamento] = useState<FaturamentoInfo>(initialData?.faturamento || {
        gatilho: "na_aprovacao",
        percentual_sinal: 40,
        forma_preferida: "Invoice",
        instrucoes: "Pagamento via invoice até 3 dias após emissão.",
    })

    const [obsCliente, setObsCliente] = useState(initialData?.obsCliente || "")
    const [obsInternas, setObsInternas] = useState(initialData?.obsInternas || "")

    // Exibir erro de clientes se houver
    useEffect(() => {
        if (clientesError) {
            showToast({
                title: 'Erro',
                message: 'Erro ao carregar lista de clientes',
                type: 'error'
            })
        }
    }, [clientesError, showToast])

    // Cálculos automáticos
    const totais = useCalcularTotais(materiais, interno)

    // Auto-save automático
    const formData: PropostaFormData = useMemo(() => ({
        cliente,
        escopo,
        prazos,
        permite,
        quaisPermites,
        normas,
        inspecoes,
        materiais,
        etapas,
        comerciais,
        interno,
        faturamento,
        obsCliente,
        obsInternas,
        status
    }), [cliente, escopo, prazos, permite, quaisPermites, normas, inspecoes, materiais, etapas, comerciais, interno, faturamento, obsCliente, obsInternas, status])

    const { debouncedSave } = useAutoSave(formData, !loading && !propostaId)

    useEffect(() => {
        if (!propostaId && cliente.id && escopo.length > 5) {
            debouncedSave(formData)
        }
    }, [formData, cliente.id, debouncedSave, escopo.length, propostaId])

    // Handlers utilitários
    const addMaterial = () =>
        setMateriais((arr) => [
            ...arr,
            { id: crypto.randomUUID(), codigo: "", nome: "", quantidade: 1, unidade: "un", status: "necessario" },
        ])
    const rmMaterial = (id: string) => setMateriais((arr) => arr.filter((m) => m.id !== id))

    const addEtapa = () =>
        setEtapas((arr) => [
            ...arr,
            { id: crypto.randomUUID(), servico: "", descricao: "", quantidade: 1, unidade: "serviço", status: "planejada" },
        ])
    const rmEtapa = (id: string) => setEtapas((arr) => arr.filter((e) => e.id !== id))

    const handleClienteChange = (clienteId: string) => {
        const clienteSelecionado = clientes.find(c => c.id === clienteId)
        if (clienteSelecionado) {
            setCliente(prev => ({
                ...prev,
                id: clienteId,
                contato_nome: clienteSelecionado.nomeCompleto || clienteSelecionado.razaoSocial || clienteSelecionado.nomeFantasia || '',
                contato_email: clienteSelecionado.email,
                contato_telefone: clienteSelecionado.telefone || '',
            }))
        }
    }

    const handleSalvar = async (isDraft = false) => {
        setSaveStatus('saving')
        setLoading(true)
        try {
            const validatedData = propostaFormSchema.parse(formData)
            const url = propostaId ? `/api/propostas/${propostaId}` : '/api/propostas'
            const method = propostaId ? 'PUT' : 'POST'
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validatedData)
            })

            if (response.ok) {
                const result = await response.json()
                setSaveStatus('saved')
                showToast({
                    title: 'Sucesso',
                    message: isDraft ? 'Rascunho salvo com sucesso!' : (propostaId ? 'Proposta atualizada!' : 'Proposta criada com sucesso!'),
                    type: 'success'
                })

                if (!isDraft && result.proposta?.id && !propostaId) {
                    router.push(`/propostas/${result.proposta.id}`)
                }
                if (propostaId) {
                    router.refresh()
                }

            } else {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Erro ao salvar proposta')
            }
        } catch (error) {
            setSaveStatus('error')
            console.error('Erro ao salvar:', error)
            showToast({
                title: 'Erro',
                message: error instanceof Error ? error.message : 'Erro ao salvar proposta',
                type: 'error'
            })
        } finally {
            setLoading(false)
            setTimeout(() => setSaveStatus('idle'), 3000)
        }
    }

    const statusBadgeVariant = status === StatusPropostaValues.PENDENTE_APROVACAO ? "orange" : status === StatusPropostaValues.APROVADA ? "success" : "destructive"
    const statusLabel = status === StatusPropostaValues.RASCUNHO ? "Rascunho" :
        status === StatusPropostaValues.PENDENTE_APROVACAO ? "Aguardando" :
            status === StatusPropostaValues.APROVADA ? "Aprovada" : "Cancelada"

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black">
            {/* Header Sticky */}
            <div className="sticky top-0 z-20 mx-auto max-w-8xl px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                    <h2 className="font-title text-xl text-slate-900 dark:text-white">{propostaId ? `Editar Proposta #${propostaId}` : 'Nova Proposta'}</h2>
                    <p className="text-sm text-slate-500">Detalhes do projeto e orçamento.</p>
                </div>
                <div className="flex items-center gap-3">
                    {status === StatusPropostaValues.RASCUNHO && (
                        <div className="hidden sm:flex items-center rounded-lg bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30">Rascunho</div>
                    )}
                    {saveStatus === 'saving' && <span className="text-xs text-slate-500">Salvando…</span>}
                    {saveStatus === 'saved' && <span className="text-xs text-emerald-600">✓ Salvo</span>}
                    {saveStatus === 'error' && <span className="text-xs text-red-600">✗ Erro</span>}
                    <Button
                        variant="ghost"
                        onClick={() => handleSalvar(true)}
                        disabled={loading || clientesLoading}
                    >
                        {loading ? '...' : 'Salvar Rascunho'}
                    </Button>
                    <Button
                        onClick={() => handleSalvar(false)}
                        disabled={loading || clientesLoading}
                        className="bg-brand-primary text-white"
                    >
                        {loading ? 'Processando...' : (propostaId ? 'Atualizar' : 'Criar Proposta')}
                    </Button>
                </div>
            </div>

            <main className="mx-auto grid max-w-8xl grid-cols-12 gap-6 px-6 py-6">
                {/* Left column (Form) */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {/* Dados Cadastrais */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Cadastrais</CardTitle>
                            <CardDescription>Informações do cliente e local do serviço.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 block">Cliente <span className="text-red-500">*</span></Label>
                                {clientesLoading ? (
                                    <div className="text-sm text-muted-foreground">Carregando...</div>
                                ) : (
                                    <Select value={cliente.id} onValueChange={handleClienteChange} disabled={clientesLoading}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecionar cliente..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientes.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.nomeCompleto || c.razaoSocial || c.nomeFantasia}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div>
                                <Label className="mb-2 block">Título da Proposta <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="Ex: Reforma Elétrica"
                                    value={cliente.titulo}
                                    onChange={(e) => setCliente({ ...cliente, titulo: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Nome Contato</Label>
                                <Input
                                    value={cliente.contato_nome}
                                    onChange={(e) => setCliente({ ...cliente, contato_nome: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Email Contato</Label>
                                <Input
                                    value={cliente.contato_email}
                                    onChange={(e) => setCliente({ ...cliente, contato_email: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="mb-2 block">Endereço de Execução <span className="text-red-500">*</span></Label>
                                <Input
                                    value={cliente.local_endereco}
                                    onChange={(e) => setCliente({ ...cliente, local_endereco: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="mb-2 block">Escopo (Resumo)</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Descrição geral do serviço..."
                                    value={escopo}
                                    onChange={(e) => setEscopo(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prazos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Prazos e Validade</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="mb-2 block">Validade (dias)</Label>
                                <Input
                                    type="number"
                                    value={prazos.tempo_para_aceite}
                                    onChange={(e) => setPrazos({ ...prazos, tempo_para_aceite: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Data Limite</Label>
                                <Input
                                    type="date"
                                    value={prazos.validade_proposta}
                                    onChange={(e) => setPrazos({ ...prazos, validade_proposta: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Execução (dias)</Label>
                                <Input
                                    type="number"
                                    value={prazos.prazo_execucao_dias}
                                    onChange={(e) => setPrazos({ ...prazos, prazo_execucao_dias: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 block">Janela</Label>
                                <Input
                                    placeholder="Seg-Sex, 8h-18h"
                                    value={prazos.janela}
                                    onChange={(e) => setPrazos({ ...prazos, janela: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Materiais */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Materiais</CardTitle>
                            <Button size="sm" variant="outline" onClick={addMaterial}>+ Adicionar</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {materiais.map((m, idx) => (
                                <div key={m.id} className="grid grid-cols-12 gap-2 items-end border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                    <div className="col-span-2">
                                        <Label className="text-xs">Código</Label>
                                        <Input className="h-9" value={m.codigo} onChange={(e) => setMateriais((arr) => arr.map((x) => (x.id === m.id ? { ...x, codigo: e.target.value } : x)))} />
                                    </div>
                                    <div className="col-span-4">
                                        <Label className="text-xs">Nome</Label>
                                        <Input className="h-9" value={m.nome} onChange={(e) => setMateriais((arr) => arr.map((x) => (x.id === m.id ? { ...x, nome: e.target.value } : x)))} />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Qtd</Label>
                                        <Input className="h-9" type="number" value={m.quantidade} onChange={(e) => setMateriais((arr) => arr.map((x) => (x.id === m.id ? { ...x, quantidade: Number(e.target.value) } : x)))} />
                                    </div>
                                    <div className="col-span-1">
                                        <Label className="text-xs">Un</Label>
                                        <Input className="h-9" value={m.unidade} onChange={(e) => setMateriais((arr) => arr.map((x) => (x.id === m.id ? { ...x, unidade: e.target.value } : x)))} />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">$ Unit</Label>
                                        <Input className="h-9" type="number" step="0.01" value={m.preco ?? ""} onChange={(e) => setMateriais((arr) => arr.map((x) => (x.id === m.id ? { ...x, preco: Number(e.target.value) } : x)))} />
                                    </div>
                                    <div className="col-span-1">
                                        <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => rmMaterial(m.id)}>X</Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Serviços */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Etapas / Serviços</CardTitle>
                            <Button size="sm" variant="outline" onClick={addEtapa}>+ Adicionar</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {etapas.map((e) => (
                                <div key={e.id} className="grid grid-cols-12 gap-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                    <div className="col-span-12 md:col-span-4">
                                        <Label className="text-xs">Serviço</Label>
                                        <Input className="h-9" value={e.servico} onChange={(ev) => setEtapas((arr) => arr.map((x) => (x.id === e.id ? { ...x, servico: ev.target.value } : x)))} />
                                    </div>
                                    <div className="col-span-12 md:col-span-8">
                                        <Label className="text-xs">Descrição</Label>
                                        <Textarea rows={2} value={e.descricao} onChange={(ev) => setEtapas((arr) => arr.map((x) => (x.id === e.id ? { ...x, descricao: ev.target.value } : x)))} />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Qtd</Label>
                                        <Input className="h-9" type="number" value={e.quantidade ?? ""} onChange={(ev) => setEtapas((arr) => arr.map((x) => (x.id === e.id ? { ...x, quantidade: Number(ev.target.value) } : x)))} />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Horas</Label>
                                        <Input className="h-9" type="number" value={e.duracaoHoras ?? ""} onChange={(ev) => setEtapas((arr) => arr.map((x) => (x.id === e.id ? { ...x, duracaoHoras: Number(ev.target.value) } : x)))} />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Custo MO</Label>
                                        <Input className="h-9" type="number" step="0.01" value={e.custoMO ?? ""} onChange={(ev) => setEtapas((arr) => arr.map((x) => (x.id === e.id ? { ...x, custoMO: Number(ev.target.value) } : x)))} />
                                    </div>
                                    <div className="col-span-3 flex items-end">
                                        <Button size="sm" variant="ghost" className="text-red-500 w-full" onClick={() => rmEtapa(e.id)}>Remover</Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Condições Comerciais */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Condições Comerciais</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label className="mb-2 block">Pagamento</Label>
                                <Input value={comerciais.condicoes_pagamento} onChange={(e) => setComerciais({ ...comerciais, condicoes_pagamento: e.target.value })} />
                            </div>
                            <div>
                                <Label className="mb-2 block">Garantia</Label>
                                <Input value={comerciais.garantia} onChange={(e) => setComerciais({ ...comerciais, garantia: e.target.value })} />
                            </div>
                            <div>
                                <Label className="mb-2 block">Exclusões</Label>
                                <Input value={comerciais.exclusoes} onChange={(e) => setComerciais({ ...comerciais, exclusoes: e.target.value })} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right column (Summary & Totals) */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <Card className="sticky top-24 border-brand-primary/20 bg-brand-primary/5">
                        <CardHeader>
                            <CardTitle className="text-brand-primary">Resumo Interno</CardTitle>
                            <Badge variant="outline">Privado</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Materiais</span>
                                <span className="font-medium">{currency(totais.mat)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Mão de Obra</span>
                                <span className="font-medium">{currency(totais.mo)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Terceiros</span>
                                <span className="font-medium">{currency(totais.terce)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Frete</span>
                                <span className="font-medium">{currency(totais.frete)}</span>
                            </div>
                            <div className="h-px bg-current opacity-10 my-2" />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Impostos</span>
                                <span className="font-medium">{currency(totais.impostos)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Margem</span>
                                <span className="font-medium">{currency(totais.margem)}</span>
                            </div>
                            <div className="h-px bg-current opacity-10 my-2" />
                            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white">
                                <span>Total</span>
                                <span>{currency(totais.precoCliente)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configuração Margem</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label>Overhead (%)</Label>
                                <Input type="number" value={interno.overhead_pct} onChange={(e) => setInterno({ ...interno, overhead_pct: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Margem (%)</Label>
                                <Input type="number" value={interno.margem_pct} onChange={(e) => setInterno({ ...interno, margem_pct: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Impostos (%)</Label>
                                <Input type="number" value={interno.impostos_pct} onChange={(e) => setInterno({ ...interno, impostos_pct: Number(e.target.value) })} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Atual:</span>
                                <Badge>{statusLabel}</Badge>
                            </div>
                            <Button variant="outline" className="w-full text-xs" onClick={() => setStatus(StatusPropostaValues.APROVADA)}>
                                Marcar como Aprovada
                            </Button>
                            <Button variant="outline" className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setStatus(StatusPropostaValues.CANCELADA)}>
                                Cancelar Proposta
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
