// src/app/api/insights/forecast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';
import { requireUser } from '@/shared/lib/rbac';
import { can, type Role } from '@/shared/lib/rbac-core';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const user = await requireUser(request);
    if (!can(user.role as Role, 'analytics', 'read')) {
      return NextResponse.json({ error: 'Forbidden', message: 'Sem permissão', success: false }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'revenue';
    const period = searchParams.get('period') || '3months';

    // Mock forecasting data
    const forecast = {
      metric,
      period,
      generatedAt: new Date().toISOString(),
      historical: [
        { date: '2023-10', actual: 85000, predicted: null },
        { date: '2023-11', actual: 92000, predicted: null },
        { date: '2023-12', actual: 88000, predicted: null },
        { date: '2024-01', actual: 95000, predicted: 95000 },
        { date: '2024-02', actual: null, predicted: 102000 },
        { date: '2024-03', actual: null, predicted: 108000 },
        { date: '2024-04', actual: null, predicted: 115000 },
      ],
      predictions: [
        {
          date: '2024-02',
          value: 102000,
          confidence: 0.82,
          range: { min: 95000, max: 109000 },
        },
        {
          date: '2024-03',
          value: 108000,
          confidence: 0.78,
          range: { min: 98000, max: 118000 },
        },
        {
          date: '2024-04',
          value: 115000,
          confidence: 0.75,
          range: { min: 102000, max: 128000 },
        },
      ],
      trends: {
        overall: 'upward',
        growthRate: 8.5,
        seasonality: 'moderate',
        confidence: 0.79,
      },
      factors: [
        {
          name: 'Market Growth',
          impact: 'positive',
          weight: 0.35,
          description: 'Mercado em expansão (+12% YoY)',
        },
        {
          name: 'New Clients',
          impact: 'positive',
          weight: 0.28,
          description: '15 novos clientes no pipeline',
        },
        {
          name: 'Competition',
          impact: 'neutral',
          weight: 0.20,
          description: 'Concorrência estável',
        },
        {
          name: 'Economic Conditions',
          impact: 'moderate_risk',
          weight: 0.17,
          description: 'Cenário econômico volátil',
        },
      ],
      scenarios: [
        {
          name: 'Conservative',
          probability: 0.25,
          prediction: 98000,
          assumptions: ['Mercado cresce 5%', '2 novos clientes'],
        },
        {
          name: 'Base Case',
          probability: 0.50,
          prediction: 108000,
          assumptions: ['Mercado cresce 8%', '5 novos clientes'],
        },
        {
          name: 'Optimistic',
          probability: 0.25,
          prediction: 125000,
          assumptions: ['Mercado cresce 12%', '8 novos clientes'],
        },
      ],
      alerts: [
        {
          type: 'warning',
          message: 'Previsão abaixo da meta em 15%',
          action: 'Revisar estratégia de vendas',
        },
        {
          type: 'info',
          message: 'Sazonalidade detectada em janeiro',
          action: 'Planejar campanha sazonal',
        },
      ],
      metadata: {
        model: 'ARIMA + Machine Learning',
        accuracy: 0.84,
        lastUpdated: '2024-01-20',
        dataPoints: 24,
        confidenceInterval: 0.95,
      },
    };

    return NextResponse.json(forecast);
  });
