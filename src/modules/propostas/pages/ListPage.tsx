// src/modules/propostas/pages/ListPage.tsx
// @ts-nocheck
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Toolbar from "../components/Toolbar";
import { Pagination } from "@/components/clientes/Pagination";
import PropostasTable from "../components/PropostasTable";
import { getPropostas, deleteProposta, duplicateProposta, sendProposta } from "../services/propostasApi";
import type { PropostaDTO } from "../services/propostasApi";
import type { StatusProposta } from "@/types/propostas";
import { Panel } from "@/components/GladPros";
import { useToast } from "@gladpros/ui/toast";

export default function PropostasListPage() {
  const { showToast } = useToast();
  
  // Filters and pagination
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // Show all by default
  const [clienteId, setClienteId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Data and UI state
  const [data, setData] = useState<PropostaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportScope, setExportScope] = useState<'selected' | 'allFiltered'>('allFiltered');
  const [sortKey, setSortKey] = useState<'numeroProposta' | 'titulo' | 'cliente' | 'status' | 'valor' | 'criadoEm'>('criadoEm');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<Array<{id: string, nome: string}>>([]);
  
  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await getPropostas({ 
        q, 
        status: status as StatusProposta | 'all' | undefined, 
        clienteId: clienteId || undefined,
        page, 
        pageSize,
        sortKey,
        sortDir
      }, signal);
      
      setData(res.data);
      setTotal(res.total);
    } catch (error: unknown) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Erro ao carregar propostas:', error);
        // Remover showToast das dependências para evitar loop infinito
      }
    } finally {
      setLoading(false);
    }
  }, [q, status, clienteId, page, pageSize, sortKey, sortDir]); // Remover showToast

  const loadClientes = useCallback(async () => {
    try {
      const response = await fetch('/api/clientes?pageSize=1000');
      if (response.ok) {
        const { data } = await response.json();
        setClientes(data.map((c: { id: string; nomeCompletoOuRazao?: string }) => ({
          id: c.id,
          nome: c.nomeCompletoOuRazao || 'Nome não informado'
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [q, status, clienteId]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProposta(id);
      showToast({ 
        title: 'Sucesso', 
        message: 'Proposta deletada com sucesso', 
        type: 'success' 
      });
      // Usar controlador para evitar requests desnecessários
      const controller = new AbortController();
      load(controller.signal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao deletar proposta';
      showToast({ 
        title: 'Erro', 
        message,
        type: 'error' 
      });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newProposta = await duplicateProposta(id);
      showToast({ 
        title: 'Sucesso', 
        message: `Proposta duplicada: ${newProposta.numeroProposta}`, 
        type: 'success' 
      });
      // Usar controlador para evitar requests desnecessários
      const controller = new AbortController();
      load(controller.signal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao duplicar proposta';
      showToast({ 
        title: 'Erro', 
        message,
        type: 'error' 
      });
    }
  };

  const handleSend = async (id: string) => {
    try {
      await sendProposta(id);
      showToast({ 
        title: 'Sucesso', 
        message: 'Proposta enviada com sucesso', 
        type: 'success' 
      });
      // Usar controlador para evitar requests desnecessários
      const controller = new AbortController();
      load(controller.signal);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar proposta';
      showToast({ 
        title: 'Erro', 
        message,
        type: 'error' 
      });
    }
  };

  const handleSort = (key: 'numeroProposta' | 'titulo' | 'cliente' | 'status' | 'valor' | 'criadoEm', dir: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDir(dir);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-xl">Propostas</h2>
  <Link href="/propostas/nova" className="rounded-2xl bg-brand-primary px-4 py-2 text-sm text-white hover:brightness-110">Nova Proposta</Link>
      </div>

      <Toolbar
        q={searchTerm}
        onQ={setSearchTerm}
        status={status}
        onStatus={setStatus}
        clienteId={clienteId}
        onClienteId={setClienteId}
        total={total}
        propostas={data}
        scope={exportScope}
        selectedCount={selectedIds.length}
        onScopeChange={setExportScope}
        loading={loading}
        clientes={clientes}
  showNew={false}
      />

      <Panel title="Lista de Propostas">
        {loading ? (
          <div className="p-6 text-sm opacity-60">Carregando…</div>
        ) : (
          <PropostasTable
            data={data}
            loading={loading}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onSend={handleSend}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </Panel>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
