// app/financeiro/contas/page.tsx
// Página de listagem de contas bancárias

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  CreditCard,
  Building2,
  Wallet,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  PageHeader, 
  Button, 
  Card, 
  CardContent, 
  Badge
} from '@gladpros/ui';

interface BankAccount {
  id: number;
  nome: string;
  banco: string;
  tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CAIXA';
  saldo: number;
  agencia?: string;
  conta?: string;
  cor?: string;
  padrao: boolean;
}

export default function ContasPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock empresaId
  const empresaId = 1;

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      // TODO: Implementar API real
      // const response = await fetch(`/api/financeiro/contas?empresaId=${empresaId}`);
      // const data = await response.json();
      
      // Mock data
      const data = {
        success: true,
        data: [
          {
            id: 1,
            nome: 'Conta Principal',
            banco: 'Banco do Brasil',
            tipo: 'CORRENTE',
            saldo: 45200.50,
            agencia: '1234-5',
            conta: '12345-6',
            cor: 'blue',
            padrao: true
          },
          {
            id: 2,
            nome: 'Reserva de Emergência',
            banco: 'Nubank',
            tipo: 'POUPANCA',
            saldo: 15000.00,
            agencia: '0001',
            conta: '987654-3',
            cor: 'purple',
            padrao: false
          },
          {
            id: 3,
            nome: 'Caixa Pequeno',
            banco: 'Interno',
            tipo: 'CAIXA',
            saldo: 350.00,
            cor: 'green',
            padrao: false
          }
        ]
      };

      if (data.success) {
        setAccounts(data.data as BankAccount[]);
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Contas Bancárias" 
        description="Gerencie suas contas bancárias e caixas"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Contas' }
        ]}
        actions={
          <Button onClick={() => router.push('/financeiro/contas/nova')} variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-slate-500 col-span-full text-center py-8">Carregando contas...</p>
        ) : accounts.map((account) => (
          <Card key={account.id} className="border-slate-200 dark:border-white/10 hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    account.tipo === 'CAIXA' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {account.tipo === 'CAIXA' ? <Wallet className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{account.nome}</h3>
                    <p className="text-xs text-slate-500">{account.banco}</p>
                  </div>
                </div>
                {account.padrao && (
                  <Badge variant="secondary" className="text-xs">Principal</Badge>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Saldo Atual</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.saldo)}
                </h2>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-sm">
                <div className="text-slate-500">
                  {account.tipo !== 'CAIXA' && (
                    <span>Ag: {account.agencia} • CC: {account.conta}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Mais opções">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Add New Card Placeholder */}
        <button 
          onClick={() => router.push('/financeiro/contas/nova')}
          className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all h-full min-h-[200px]"
        >
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-medium">Adicionar Nova Conta</span>
        </button>
      </div>
    </div>
  );
}
