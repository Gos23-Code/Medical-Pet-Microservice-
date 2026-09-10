import { NextRequest, NextResponse } from 'next/server';
import { SupabaseVisitRepository } from '@/src/infrastructure/database/repositories/supabase-visit.repository';
import { ProcessVisitRemindersUseCase } from '@/src/application/use-cases/visits/process-visit-reminder.use-case';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const repository = new SupabaseVisitRepository();
const visitsPublisher = createVisitsPublisher();

// ✅ GET - Para pruebas automáticas (sin userId)
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId');
    
    if (!petId) {
      return NextResponse.json(
        { success: false, error: 'petId es requerido' },
        { status: 400 }
      );
    }

    console.log(`🚀 GET - Procesando recordatorios de visitas para mascota: ${petId}`);
    
    const useCase = new ProcessVisitRemindersUseCase(repository, visitsPublisher);
    const result = await useCase.execute(petId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Visit reminders processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error processing visit reminders:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ✅ POST - Activación manual desde frontend (userId en body)
export async function POST(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId');
    
    if (!petId) {
      return NextResponse.json(
        { success: false, error: 'petId es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId es requerido en el body para notificaciones' },
        { status: 400 }
      );
    }

    console.log(`🚀 POST - Procesando recordatorios de visitas para mascota: ${petId} (usuario: ${userId})`);
    
    const useCase = new ProcessVisitRemindersUseCase(repository, visitsPublisher);
    const result = await useCase.execute(petId, userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Visit reminders processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error processing visit reminders:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}