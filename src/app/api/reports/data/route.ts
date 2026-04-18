import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

// Mock data for reports
const mockReportsData = {
  proposalsReport: {
    total: 45,
    byStatus: {
      rascunho: 8,
      enviada: 15,
      aprovada: 12,
      rejeitada: 5,
      finalizada: 5
    },
    byMonth: [
      { month: 'Jan', count: 5 },
      { month: 'Fev', count: 8 },
      { month: 'Mar', count: 12 },
      { month: 'Abr', count: 7 },
      { month: 'Mai', count: 13 }
    ],
    averageValue: 8750,
    totalValue: 393750
  },
  clientsReport: {
    total: 28,
    active: 22,
    newThisMonth: 3,
    topByRevenue: [
      { name: 'Tech Solutions Ltda', revenue: 45000, proposals: 8 },
      { name: 'Inovação Digital', revenue: 32000, proposals: 6 },
      { name: 'Global Systems', revenue: 28000, proposals: 5 }
    ]
  },
  performanceReport: {
    conversionRate: 26.67, // approved / sent
    averageProposalTime: 7.5, // days
    successRate: 71.43, // approved / (approved + rejected)
    monthlyGrowth: 15.2
  }
};

export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let data = mockReportsData;

    // Filter by type if specified
    if (type !== 'all') {
      data = { [type]: mockReportsData[type as keyof typeof mockReportsData] } as typeof mockReportsData;
    }

    return NextResponse.json({
      success: true,
      data,
      filters: { type, startDate, endDate },
      timestamp: new Date().toISOString()
    });
  });

// Export reports as CSV
export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    const { type, format = 'csv' } = body;

    // In a real implementation, this would generate actual CSV/Excel files
    // For now, return mock response
    return NextResponse.json({
      success: true,
      message: `Report exported successfully in ${format} format`,
      downloadUrl: `/api/reports/download/${type}.${format}`,
      timestamp: new Date().toISOString()
    });
  });
