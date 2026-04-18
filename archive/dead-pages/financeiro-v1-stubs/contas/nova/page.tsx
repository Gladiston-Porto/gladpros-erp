// app/financeiro/contas/nova/page.tsx
// Formulário para criar nova conta bancária

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Building2, Wallet } from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  CardContent, 
  Button, 
  Input
} from '@gladpros/ui';

interface FormData {
  empresaId: number;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  saldoInicial: string;
  dataSaldoInicial: string;
  status: string;
  padrao: boolean;
}

const FormLabel = ({ children, htmlFor, required, className = '' }: { children: React.ReactNode, htmlFor?: string, required?: boolean, className?: string }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}>
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export default function NovaContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    empresaId: 1, // Mock
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'CORRENTE',
    saldoInicial: '0',
    dataSaldoInicial: new Date().toISOString().split('T')[0],
    status: 'ATIVA',
    padrao: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar payload
      const payload = {
        empresaId: formData.empresaId,
        nome: formData.nome,
        banco: formData.banco,
        agencia: formData.agencia,
        conta: formData.conta,
        tipo: formData.tipo,
        saldoInicial: parseFloat(formData.saldoInicial),
        dataSaldoInicial: new Date(formData.dataSaldoInicial).toISOString(),
        status: formData.status,
        padrao: formData.padrao,
      };

      // TODO: Implementar API real
      // const response = await fetch('/api/financeiro/contas', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/financeiro/contas');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      alert('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const inputClass = "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Nova Conta Bancária" 
        description="Cadastre uma nova conta bancária ou caixa"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Contas', href: '/financeiro/contas' },
          { label: 'Nova' }
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Dados da Conta
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <FormLabel htmlFor="nome" required>Nome da Conta</FormLabel>
                  <Input
                    id="nome"
                    required
                    value={formData.nome}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('nome', e.target.value)}
                    placeholder="Ex: Banco do Brasil - Principal"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="banco" required>Banco</FormLabel>
                  <Input
                    id="banco"
                    required
                    value={formData.banco}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('banco', e.target.value)}
                    placeholder="Ex: Banco do Brasil"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="tipo" required>Tipo de Conta</FormLabel>
                  <select
                    id="tipo"
                    aria-label="Tipo de Conta"
                    required
                    value={formData.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className={inputClass}
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Conta Poupança</option>
                    <option value="INVESTIMENTO">Conta Investimento</option>
                    <option value="CAIXA">Caixa Físico</option>
                  </select>
                </div>

                <div>
                  <FormLabel htmlFor="agencia">Agência</FormLabel>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('agencia', e.target.value)}
                    placeholder="0000-0"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="conta">Número da Conta</FormLabel>
                  <Input
                    id="conta"
                    value={formData.conta}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('conta', e.target.value)}
                    placeholder="00000-0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                <Wallet className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Saldo Inicial e Configurações
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <FormLabel htmlFor="saldoInicial" required>Saldo Inicial (R$)</FormLabel>
                  <Input
                    id="saldoInicial"
                    type="number"
                    step="0.01"
                    required
                    value={formData.saldoInicial}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('saldoInicial', e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="dataSaldoInicial" required>Data do Saldo</FormLabel>
                  <Input
                    id="dataSaldoInicial"
                    type="date"
                    required
                    value={formData.dataSaldoInicial}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dataSaldoInicial', e.target.value)}
                  />
                </div>

                <div>
                  <FormLabel htmlFor="status">Status</FormLabel>
                  <select
                    id="status"
                    aria-label="Status"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="ATIVA">Ativa</option>
                    <option value="INATIVA">Inativa</option>
                  </select>
                </div>

                <div className="col-span-3 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="padrao"
                    aria-label="Conta padrão"
                    checked={formData.padrao}
                    onChange={(e) => handleChange('padrao', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  <FormLabel htmlFor="padrao" className="cursor-pointer mb-0">
                    Definir como conta padrão para recebimentos e pagamentos
                  </FormLabel>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Conta'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
