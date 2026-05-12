'use client';

/**
 * WorkerForm Component
 * 
 * Formulário para criar/editar Workers (1099 Contractors / Vendors).
 * 
 * NÃO inclui campos de RH/W-2:
 * - Sem benefícios
 * - Sem W-4
 * - Sem data admissão/demissão
 * - Sem salário base
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Building2,
    MapPin,
    CreditCard,
    Save,
    ArrowLeft,
    Loader2
} from 'lucide-react';
import {  } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Input } from '@gladpros/ui/input'
import { Label } from '@gladpros/ui/label';
import { toast } from 'sonner';
import { parseApiError } from '@/lib/api/parseApiError';

interface WorkerFormData {
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
    type: 'INDIVIDUAL' | 'COMPANY';
    companyName: string;
    ein: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    defaultHourlyRate: string;
    financialProfile: {
        paymentMethod: string;
        payeeName: string;
        accountLast4: string;
        taxIdLast4: string;
        preferredPayday: string;
    };
}

interface WorkerFormProps {
    initialData?: Partial<WorkerFormData>;
    workerId?: number;
    isEditing?: boolean;
    baseUrl?: string; // Default: /rh/workers
}

function formatPhoneUS(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const PAYMENT_METHODS = [
    { value: 'CHECK', label: 'Check' },
    { value: 'ZELLE', label: 'Zelle' },
    { value: 'ACH', label: 'ACH / Direct Deposit' },
    { value: 'WIRE', label: 'Wire Transfer' },
    { value: 'CASH', label: 'Cash' },
    { value: 'OTHER', label: 'Other' }
];

const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function WorkerForm({ initialData, workerId, isEditing = false, baseUrl = '/rh/workers' }: WorkerFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<WorkerFormData>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        addressLine1: initialData?.addressLine1 || '',
        addressLine2: initialData?.addressLine2 || '',
        city: initialData?.city || '',
        state: initialData?.state || 'TX',
        zip: initialData?.zip || '',
        type: initialData?.type || 'INDIVIDUAL',
        companyName: initialData?.companyName || '',
        ein: initialData?.ein || '',
        status: initialData?.status || 'ACTIVE',
        defaultHourlyRate: initialData?.defaultHourlyRate || '',
        financialProfile: {
            paymentMethod: initialData?.financialProfile?.paymentMethod || 'CHECK',
            payeeName: initialData?.financialProfile?.payeeName || '',
            accountLast4: initialData?.financialProfile?.accountLast4 || '',
            taxIdLast4: initialData?.financialProfile?.taxIdLast4 || '',
            preferredPayday: initialData?.financialProfile?.preferredPayday || ''
        }
    });

    const handleChange = (field: string, value: string) => {
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
        if (field.startsWith('financialProfile.')) {
            const subField = field.replace('financialProfile.', '');
            setFormData(prev => ({
                ...prev,
                financialProfile: {
                    ...prev.financialProfile,
                    [subField]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const validateLocal = (): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) {
            errors.name = 'Nome é obrigatório';
        }
        if (formData.type === 'INDIVIDUAL' && !formData.email.trim()) {
            errors.email = 'Email é obrigatório para workers do tipo Individual';
        }
        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            errors.email = 'Email inválido';
        }
        if (formData.type === 'COMPANY' && !formData.companyName.trim()) {
            errors.companyName = 'Nome da empresa é obrigatório';
        }
        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const localErrors = validateLocal();
        if (Object.keys(localErrors).length > 0) {
            setFieldErrors(localErrors);
            toast.error(Object.values(localErrors)[0]);
            return;
        }
        setFieldErrors({});

        setLoading(true);
        try {
            const url = isEditing
                ? `/api/workforce/workers/${workerId}`
                : '/api/workforce/workers';

            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    defaultHourlyRate: formData.defaultHourlyRate ? parseFloat(formData.defaultHourlyRate) : null,
                    financialProfile: formData.financialProfile.paymentMethod ? formData.financialProfile : undefined
                })
            });

            const data = await res.json();

            if (data.success) {
                toast.success(isEditing ? 'Worker atualizado!' : 'Worker criado!');
                router.push(`${baseUrl}/${data.data?.id || workerId}`);
            } else {
                const { fieldErrors: serverErrors, firstMessage } = parseApiError(data, 'Erro ao salvar worker');
                setFieldErrors(serverErrors);
                toast.error(firstMessage);
            }
        } catch (error) {
            console.error('Erro:', error);
            toast.error('Erro ao salvar worker');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tipo de Worker */}
            <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Tipo de Worker
                </h3>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => handleChange('type', 'INDIVIDUAL')}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${formData.type === 'INDIVIDUAL'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <User className={`h-8 w-8 mx-auto mb-2 ${formData.type === 'INDIVIDUAL' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <p className="font-medium">Individual</p>
                        <p className="text-sm text-gray-500">Pessoa Física (1099-NEC)</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleChange('type', 'COMPANY')}
                        className={`flex-1 p-4 rounded-lg border-2 transition-all ${formData.type === 'COMPANY'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Building2 className={`h-8 w-8 mx-auto mb-2 ${formData.type === 'COMPANY' ? 'text-purple-600' : 'text-gray-400'}`} />
                        <p className="font-medium">Empresa</p>
                        <p className="text-sm text-gray-500">LLC, Corp (1099-MISC)</p>
                    </button>
                </div>
            </div>

            {/* Dados Básicos */}
            <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">Dados Básicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Label htmlFor="name">
                            Nome Completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder={formData.type === 'COMPANY' ? 'Nome do Contato' : 'Nome completo'}
                            aria-invalid={!!fieldErrors.name}
                            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                        />
                        {fieldErrors.name && (
                            <p id="name-error" className="mt-1 text-sm text-destructive">{fieldErrors.name}</p>
                        )}
                    </div>

                    {formData.type === 'COMPANY' && (
                        <>
                            <div>
                                <Label htmlFor="companyName">
                                    Nome da Empresa <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="companyName"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    placeholder="LLC, Corp, etc"
                                    aria-invalid={!!fieldErrors.companyName}
                                    aria-describedby={fieldErrors.companyName ? 'companyName-error' : undefined}
                                />
                                {fieldErrors.companyName && (
                                    <p id="companyName-error" className="mt-1 text-sm text-destructive">{fieldErrors.companyName}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="ein">EIN (Employer ID)</Label>
                                <Input
                                    id="ein"
                                    value={formData.ein}
                                    onChange={(e) => handleChange('ein', e.target.value)}
                                    placeholder="XX-XXXXXXX"
                                    aria-invalid={!!fieldErrors.ein}
                                    aria-describedby={fieldErrors.ein ? 'ein-error' : undefined}
                                />
                                {fieldErrors.ein && (
                                    <p id="ein-error" className="mt-1 text-sm text-destructive">{fieldErrors.ein}</p>
                                )}
                            </div>
                        </>
                    )}

                    <div>
                        <Label htmlFor="email">
                            Email {formData.type === 'INDIVIDUAL' && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="email@example.com"
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                        />
                        {fieldErrors.email && (
                            <p id="email-error" className="mt-1 text-sm text-destructive">{fieldErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', formatPhoneUS(e.target.value))}
                            placeholder="(555) 123-4567"
                            maxLength={14}
                        />
                    </div>

                    <div>
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            <option value="ACTIVE">Ativo</option>
                            <option value="INACTIVE">Inativo</option>
                            <option value="SUSPENDED">Suspenso</option>
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="defaultHourlyRate">Taxa Hora Padrão ($)</Label>
                        <Input
                            id="defaultHourlyRate"
                            type="number"
                            step="0.01"
                            value={formData.defaultHourlyRate}
                            onChange={(e) => handleChange('defaultHourlyRate', e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>

            {/* Endereço */}
            <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <Label htmlFor="addressLine1">Endereço</Label>
                        <Input
                            id="addressLine1"
                            value={formData.addressLine1}
                            onChange={(e) => handleChange('addressLine1', e.target.value)}
                            placeholder="123 Main Street"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="addressLine2">Complemento</Label>
                        <Input
                            id="addressLine2"
                            value={formData.addressLine2}
                            onChange={(e) => handleChange('addressLine2', e.target.value)}
                            placeholder="Apt, Suite, etc"
                        />
                    </div>
                    <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder="Houston"
                        />
                    </div>
                    <div>
                        <Label htmlFor="state">Estado</Label>
                        <select
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleChange('state', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {US_STATES.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input
                            id="zip"
                            value={formData.zip}
                            onChange={(e) => handleChange('zip', e.target.value)}
                            placeholder="77001"
                        />
                    </div>
                </div>
            </div>

            {/* Dados Financeiros */}
            <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    Dados de Pagamento
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Apenas informações básicas. Dados sensíveis completos são gerenciados separadamente.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                        <select
                            id="paymentMethod"
                            value={formData.financialProfile.paymentMethod}
                            onChange={(e) => handleChange('financialProfile.paymentMethod', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {PAYMENT_METHODS.map(pm => (
                                <option key={pm.value} value={pm.value}>{pm.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="payeeName">Nome do Beneficiário</Label>
                        <Input
                            id="payeeName"
                            value={formData.financialProfile.payeeName}
                            onChange={(e) => handleChange('financialProfile.payeeName', e.target.value)}
                            placeholder="Nome como aparece no banco"
                        />
                    </div>
                    <div>
                        <Label htmlFor="accountLast4">Últimos 4 dígitos da Conta</Label>
                        <Input
                            id="accountLast4"
                            value={formData.financialProfile.accountLast4}
                            onChange={(e) => handleChange('financialProfile.accountLast4', e.target.value.slice(0, 4))}
                            placeholder="1234"
                            maxLength={4}
                        />
                    </div>
                    <div>
                        <Label htmlFor="taxIdLast4">Últimos 4 dígitos do Tax ID</Label>
                        <Input
                            id="taxIdLast4"
                            value={formData.financialProfile.taxIdLast4}
                            onChange={(e) => handleChange('financialProfile.taxIdLast4', e.target.value.slice(0, 4))}
                            placeholder="5678"
                            maxLength={4}
                        />
                    </div>
                    <div>
                        <Label htmlFor="preferredPayday">Dia de Pagamento Preferido</Label>
                        <Input
                            id="preferredPayday"
                            value={formData.financialProfile.preferredPayday}
                            onChange={(e) => handleChange('financialProfile.preferredPayday', e.target.value)}
                            placeholder="1st, 15th, Friday, etc"
                        />
                    </div>
                </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <Button type="submit" variant="default" disabled={loading}>
                    {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditing ? 'Salvar Alterações' : 'Criar Worker'}
                </Button>
            </div>
        </form>
    );
}
