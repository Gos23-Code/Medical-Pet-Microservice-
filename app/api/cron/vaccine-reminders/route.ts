import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { ProcessVaccineRemindersUseCase } from '@/src/application/use-cases/vaccine/proccess-vaccine-reminder.use-case';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const repository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();

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

    console.log(`🚀 GET - Procesando recordatorios para mascota: ${petId}`);
    
    const useCase = new ProcessVaccineRemindersUseCase(repository, vaccinePublisher);
    const result = await useCase.execute(petId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Vaccine reminders processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error processing vaccine reminders:', error);
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

    console.log(`🚀 POST - Procesando recordatorios para mascota: ${petId} (usuario: ${userId})`);
    
    const useCase = new ProcessVaccineRemindersUseCase(repository, vaccinePublisher);
    const result = await useCase.execute(petId, userId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Vaccine reminders processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error processing vaccine reminders:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}