import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/error-handler';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(async (request: NextRequest,
  { params }: RouteParams) => {
    const { id } = await params;
    
    return NextResponse.json({
      message: `Tarefa ${id} encontrada`,
      id: id,
      timestamp: new Date().toISOString()
    });
  });

export const PUT = withErrorHandler(async (request: NextRequest,
  { params }: RouteParams) => {
    const { id } = await params;
    const body = await request.json();
    
    return NextResponse.json({
      message: `Tarefa ${id} atualizada`,
      id: id,
      data: body,
      timestamp: new Date().toISOString()
    });
  });

export const DELETE = withErrorHandler(async (request: NextRequest,
  { params }: RouteParams) => {
    const { id } = await params;
    
    return NextResponse.json({
      message: `Tarefa ${id} removida`,
      id: id,
      timestamp: new Date().toISOString()
    });
  });
