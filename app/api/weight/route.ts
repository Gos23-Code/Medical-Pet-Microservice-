import { withCorrections } from '@/src/infrastructure/clinical/act-versions';
import { NextRequest, NextResponse } from 'next/server';
import { AddWeightRecordUseCase } from '@/src/application/use-cases/weight-record/add-weight-record.use-case';
import { SupabaseWeightRecordRepository } from '@/src/infrastructure/database/repositories/supabase-weight-record.repository';
import { GetLatestWeightRecordByPetIdUseCase } from '@/src/application/use-cases//weight-record/get-latest-weight-record.use-case';
import { createWeightRecordPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { saveExtras } from '@/src/infrastructure/database/clinical-extras';
import { WEIGHT_REGISTRATION_COLUMNS } from '@/src/application/clinical/clinical-specs';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';
import {
  SupabaseClinicalAuditRepository,
} from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';

const repository = new SupabaseWeightRecordRepository();
const auditRepository = new SupabaseClinicalAuditRepository();

// ✅ Obtener instancia del publisher
const weightRecordPublisher = createWeightRecordPublisher();

// ============================================
// POST - Registrar peso
// 2 en 1: el dueño (Source = OWNER) y la clínica con NURSING_WRITE (Source = CLINIC)
// usan EL MISMO body: petId, weight, unit?, date?, note?. Quién registra sale del token.
// ============================================
export const POST = withAuth(async (req: NextRequest, _context, actor) => {
  console.log('🚀 POST /api/weightRecord');
  const body = await req.json();

  if (!body.petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }

  if (!body.weight) {
    return NextResponse.json({ error: 'weight es requerido' }, { status: 400 });
  }

  const authorship = await authorizePet(actor, body.petId, 'WEIGHT_WRITE');

  // Peso anterior: para detectar alertas
  const previousWeight = await new GetLatestWeightRecordByPetIdUseCase(repository).execute(body.petId);

  const useCase = new AddWeightRecordUseCase(repository);
  const result = await useCase.execute({
    userId: actor.userId,
    petId: body.petId,
    weight: body.weight,
    unit: body.unit || 'kg',
    date: body.date,
    note: body.note,
    source: authorship.source,
    veterinaryId: authorship.veterinaryId,
  });

  // Quién lo registró: el dueño, o el empleado de la clínica (rol del token)
  await saveExtras('WeightRecord', result.id, {
    [WEIGHT_REGISTRATION_COLUMNS.userId]: actor.userId,
    [WEIGHT_REGISTRATION_COLUMNS.employeeId]: authorship.employeeId,
    [WEIGHT_REGISTRATION_COLUMNS.role]: authorship.source === 'OWNER' ? 'OWNER' : actor.clinic?.role ?? null,
  });

  await auditRepository.record({
    tableName: 'WeightRecord',
    recordId: result.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  const target = await resolveEventTarget(body.petId, authorship);
  if (target) {
    try {
      await weightRecordPublisher.publishWeightRecorded({
        weightId: result.id,
        petId: body.petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        weight: body.weight,
        unit: body.unit || 'kg',
        recordedAt: body.date || new Date().toISOString(),
        notes: body.note,
      });
      console.log('✅ Evento WEIGHT_RECORDED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }

    // Alerta si el cambio respecto al peso anterior supera el 10 %
    if (previousWeight && previousWeight.weight) {
      const previous = previousWeight.weight;
      const current = body.weight;
      const percentageChange = Math.abs(((current - previous) / previous) * 100);

      if (percentageChange > 10) {
        const alertType = current > previous ? 'GAIN' : 'LOSS';
        try {
          await weightRecordPublisher.publishWeightAlert({
            petId: body.petId,
            userId: target.userId,
            recipient: target.recipient,
            veterinaryId: target.veterinaryId,
            veterinaryName: target.veterinaryName,
            currentWeight: current,
            previousWeight: previous,
            percentageChange: percentageChange,
            alertType: alertType,
            alertedAt: new Date().toISOString(),
          });
          console.log('✅ Evento WEIGHT_ALERT publicado correctamente');
        } catch (pubsubError) {
          console.error('❌ Error publicando en Pub/Sub:', pubsubError);
        }
      }
    }
  }

  return NextResponse.json({ ...result, source: authorship.source, veterinaryId: authorship.veterinaryId }, { status: 201 });
});

// ============================================
// GET - Registros de peso de UNA mascota (dueño o clínica con CLINICAL_READ)
// ?petId=...&latest=true → solo el último
// Sin petId ya no se listan todas las mascotas: no hay forma de autorizarlo.
// ============================================
export const GET = withAuth(async (req: NextRequest, _context, actor) => {
  console.log('🚀 GET /api/weightRecord');
  const petId = req.nextUrl.searchParams.get('petId');
  const latest = req.nextUrl.searchParams.get('latest');

  if (!petId) {
    return NextResponse.json({ error: 'petId es requerido' }, { status: 400 });
  }

  await authorizePet(actor, petId, 'CLINICAL_READ');

  if (latest === 'true') {
    const result = await new GetLatestWeightRecordByPetIdUseCase(repository).execute(petId);
    if (!result) {
      return NextResponse.json({ error: 'La mascota no tiene pesos registrados' }, { status: 404 });
    }
    return NextResponse.json(await withCorrections('WeightRecord', result), { status: 200 });
  }

  // Historial para la pestaña Peso: origen, fecha, nota y quién lo registró
  const { data, error } = await createClient()
    .from('WeightRecord')
    .select('id, PetId, Weight, Date, Note, Created_at, VeterinaryId, Source, RegisteredByUserId, RegisteredByEmployeeId, RegisteredByRole')
    .eq('PetId', petId)
    .order('Created_at', { ascending: false });
  if (error) {
    throw new Error(`Error: ${error.message}`);
  }

  const records = (data ?? []).map((row) => ({
    id: row.id,
    petId: row.PetId,
    weight: row.Weight,
    unit: 'kg',
    date: row.Date,
    note: row.Note,
    createdAt: row.Created_at,
    source: row.Source,
    veterinaryId: row.VeterinaryId,
    registeredBy: {
      userId: row.RegisteredByUserId,
      employeeId: row.RegisteredByEmployeeId,
      role: row.RegisteredByRole,
    },
  }));
  return NextResponse.json(await withCorrections('WeightRecord', records), { status: 200 });
});

// PATCH ya no sobrescribe el peso: la corrección es POST /api/weight/{id}/corrections (motivo obligatorio).
export const PATCH = overwriteRefused('/api/weight/{id}/corrections');
