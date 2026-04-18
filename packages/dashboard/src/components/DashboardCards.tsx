'use client'

import { DollarSign, Package, FileText, Users, TrendingUp, TrendingDown } from 'lucide-react'

type DashboardData = {
  totalClientes?: number
  propostas?: { pendentes?: number }
  projetosAtivos?: number
  receitaMensal?: number
}

export default function DashboardCards({ dados }: { dados?: DashboardData | null }) {
  const cards = [
    {
      title: 'Total de Clientes',
      value: dados?.totalClientes || 156,
      trend: '+12%',
      trendUp: true,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Propostas Pendentes',
      value: dados?.propostas?.pendentes || 23,
      trend: '+5%',
      trendUp: true,
      icon: FileText,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Projetos Ativos',
      value: dados?.projetosAtivos || 8,
      trend: '-2%',
      trendUp: false,
      icon: Package,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${(dados?.receitaMensal || 125000).toLocaleString()}`,
      trend: '+18%',
      trendUp: true,
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const IconComponent = card.icon
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <IconComponent className={`w-6 h-6 ${card.textColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${card.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {card.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {card.trend}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-foreground dark:text-white">{card.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}