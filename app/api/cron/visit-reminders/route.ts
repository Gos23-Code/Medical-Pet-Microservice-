import { NextRequest, NextResponse } from 'next/server';
import { SupabaseVisitRepository } from '@/src/infrastructure/database/repositories/supabase-visit.repository';
import { ProcessVisitRemindersUseCase } from '@/src/application/use-cases/visits/process-visit-reminder.use-case';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { assertInternalKey } from '@/src/infrastructure/auth/internal-key';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { toErrorResponse, ConflictError } from '@/src/infrastructure/http/api-error';

const repository = new SupabaseVisitRepository();
const visitsPublisher = createVisitsPublisher();

// Cron jobs (Cloud Scheduler) y pruebas: solo X-Internal-Api-Key, nunca JWT de usuario (MED-01 §4).

// ✅ GET - Para pruebas (sin userId)
export async function GET(request: NextRequest) {
  try {
    assertInternalKey(request);

    const petId = request.nextUrl.searchParams.get('petId');

    if (!petId) {
      return NextResponse.json({ success: false, error: 'petId es requerido' }, { status: 400 });
    }

    console.log(`🚀 GET - Procesando recordatorios de visitas para mascota: ${petId}`);

    const useCase = new ProcessVisitRemindersUseCase(repository, visitsPublisher);
    const result = await useCase.execute(petId);

    return NextResponse.json({
      success: true,
      message: 'Visit reminders processed successfully',
      data: result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

// ✅ POST - Activación desde el scheduler. El dueño sale de Pets, no del body.
export async function POST(request: NextRequest) {
  try {
    assertInternalKey(request);

    const petId = request.nextUrl.searchParams.get('petId');

    if (!petId) {
      return NextResponse.json({ success: false, error: 'petId es requerido' }, { status: 400 });
    }

    const target = await resolveEventTarget(petId, { veterinaryId: null });
    if (!target?.userId) {
      throw new ConflictError('OWNER_WITHOUT_ACCOUNT', 'La mascota no tiene un dueño con cuenta para recordatorios');
    }

    console.log(`🚀 POST - Procesando recordatorios de visitas para mascota: ${petId} (dueño: ${target.userId})`);

    const useCase = new ProcessVisitRemindersUseCase(repository, visitsPublisher);
    const result = await useCase.execute(petId, target.userId);

    return NextResponse.json({
      success: true,
      message: 'Visit reminders processed successfully',
      data: result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
