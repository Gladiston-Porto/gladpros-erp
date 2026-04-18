'use client';

/**
 * WorkerList Component
 * 
 * Lista de Workers (1099 Contractors / Vendors) com:
 * - Busca por nome/email
 * - Filtro por status e tipo
 * - Ações: editar, ver detalhes
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User,
    Building2,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    DollarSign,
    Briefcase,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Input } from '@gladpros/ui/input';

interface Worker {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    type: 'INDIVIDUAL' | 'COMPANY';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    companyName: string | null;
    defaultHourlyRate: number | null;
    financialProfile: {
        paymentMethod: string;
        payeeName: string | null;
        accountLast4: string | null;
    } | null;
    _count: {
        assignments: number;
        payables: number;
    };
}

interface WorkerListProps {
    initialStatus?: string;
    initialType?: string;
    baseUrl?: string; // Default: /rh/workers
}

export function WorkerList({ initialStatus, initialType, baseUrl = '/rh/workers' }: WorkerListProps) {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(initialStatus || '');
    const [type, setType] = useState(initialType || '');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchWorkers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (status) params.set('status', status);
            if (type) params.set('type', type);
            params.set('page', page.toString());
            params.set('limit', '10');

            const res = await fetch(`/api/workforce/workers?${params}`);
            const data = await res.json();

            if (data.success) {
                setWorkers(data.data.data || []);
                setTotalPages(data.data.pagination?.totalPages || 1);
                setTotal(data.data.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Erro ao buscar workers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkers();
    }, [page, status, type]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchWorkers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; label: string }> = {
            'ACTIVE': { color: 'bg-green-100 text-green-800', label: 'Ativo' },
            'INACTIVE': { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
            'SUSPENDED': { color: 'bg-red-100 text-red-800', label: 'Suspenso' }
        };
        const v = variants[status] || variants['INACTIVE'];
        return <Badge className={`${v.color} text-xs`}>{v.label}</Badge>;
    };

    const getTypeBadge = (type: string) => {
        if (type === 'COMPANY') {
            return (
                <Badge className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Empresa
                </Badge>
            );
        }
        return (
            <Badge className="bg-blue-100 text-blue-800 text-xs flex items-center gap-1">
                <User className="h-3 w-3" />
                Individual
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2 border rounded-lg text-sm"
                >
                    <option value="">Todos os status</option>
                    <option value="ACTIVE">Ativos</option>
                    <option value="INACTIVE">Inativos</option>
                    <option value="SUSPENDED">Suspensos</option>
                </select>
                <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); setPage(1); }}
                    className="px-3 py-2 border rounded-lg text-sm"
                >
                    <option value="">Todos os tipos</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="COMPANY">Empresa</option>
                </select>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : workers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum worker encontrado</p>
                    <Link href={`${baseUrl}/novo`}>
                        <Button variant="outline" className="mt-4">
                            Adicionar primeiro Worker
                        </Button>
                    </Link>
                </div>
            ) : (
                <>
                    {/* Lista */}
                    <div className="divide-y">
                        {workers.map((worker) => (
                            <Link
                                key={worker.id}
                                href={`${baseUrl}/${worker.id}`}
                                className="block hover:bg-gray-50 transition-colors"
                            >
                                <div className="p-4 flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold
                                        ${worker.type === 'COMPANY' ? 'bg-purple-500' : 'bg-blue-500'}
                                    `}>
                                        {worker.type === 'COMPANY' ? (
                                            <Building2 className="h-6 w-6" />
                                        ) : (
                                            worker.name.charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-gray-900 truncate">
                                                {worker.name}
                                            </h4>
                                            {getStatusBadge(worker.status)}
                                            {getTypeBadge(worker.type)}
                                        </div>
                                        {worker.companyName && (
                                            <p className="text-sm text-gray-600">{worker.companyName}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            {worker.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {worker.email}
                                                </span>
                                            )}
                                            {worker.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {worker.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
                                        {worker.defaultHourlyRate && (
                                            <div className="text-center">
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <DollarSign className="h-4 w-4" />
                                                    <span className="font-medium">{worker.defaultHourlyRate}/h</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Rate</p>
                                            </div>
                                        )}
                                        <div className="text-center">
                                            <div className="flex items-center gap-1">
                                                <Briefcase className="h-4 w-4" />
                                                <span className="font-medium">{worker._count.assignments}</span>
                                            </div>
                                            <p className="text-xs text-gray-400">Assignments</p>
                                        </div>
                                        {worker.financialProfile?.paymentMethod && (
                                            <div className="text-center">
                                                <Badge className="bg-gray-100 text-gray-800 text-xs">
                                                    {worker.financialProfile.paymentMethod}
                                                </Badge>
                                                {worker.financialProfile.accountLast4 && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        ****{worker.financialProfile.accountLast4}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight className="h-5 w-5 text-gray-400" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-gray-500">
                                Mostrando {workers.length} de {total} workers
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-gray-600">
                                    {page} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
