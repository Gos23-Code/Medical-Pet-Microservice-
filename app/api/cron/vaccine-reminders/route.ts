import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { ProcessVaccineRemindersUseCase } from '@/src/application/use-cases/vaccine/proccess-vaccine-reminder.use-case';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { assertInternalKey } from '@/src/infrastructure/auth/internal-key';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { toErrorResponse, ConflictError } from '@/src/infrastructure/http/api-error';

const repository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();

// Cron jobs (Cloud Scheduler) y pruebas: solo X-Internal-Api-Key, nunca JWT de usuario (MED-01 §4).

// ✅ GET - Para pruebas (sin userId)
export async function GET(request: NextRequest) {
  try {
    assertInternalKey(request);

    const petId = request.nextUrl.searchParams.get('petId');

    if (!petId) {
      return NextResponse.json({ success: false, error: 'petId es requerido' }, { status: 400 });
    }

    console.log(`🚀 GET - Procesando recordatorios para mascota: ${petId}`);

    const useCase = new ProcessVaccineRemindersUseCase(repository, vaccinePublisher);
    const result = await useCase.execute(petId);

    return NextResponse.json({
      success: true,
      message: 'Vaccine reminders processed successfully',
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
      // El caso de uso de recordatorios se arma con userId; sin cuenta no hay a quién avisar aquí
      throw new ConflictError('OWNER_WITHOUT_ACCOUNT', 'La mascota no tiene un dueño con cuenta para recordatorios');
    }

    console.log(`🚀 POST - Procesando recordatorios para mascota: ${petId} (dueño: ${target.userId})`);

    const useCase = new ProcessVaccineRemindersUseCase(repository, vaccinePublisher);
    const result = await useCase.execute(petId, target.userId);

    return NextResponse.json({
      success: true,
      message: 'Vaccine reminders processed successfully',
      data: result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
