import { withErrorHandler } from '@/lib/api/error-handler';
// src/app/api/tasks/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler(async () => {
  return NextResponse.json({ 
    message: "Tasks API funcionando",
    tasks: [],
    timestamp: new Date().toISOString()
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
    const body = await request.json();
    
    // Simulate creating a task
    const newTask = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json({ 
      message: "Tarefa criada com sucesso",
      task: newTask
    }, { status: 201 });
  });