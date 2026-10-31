import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { petIdOfVisit } from '@/src/infrastructure/database/pet-lookup';
import { NotFoundError } from '@/src/infrastructure/http/api-error';
import { parseFields, toResponse } from '@/src/application/clinical/field-spec';
import { parseClinicExtras } from '@/src/application/clinical/clinic-only';
import { TREATMENT_EXTRA_FIELDS } from '@/src/application/clinical/clinical-specs';

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();
const auditRepository = new SupabaseClinicalAuditRepository();

// POST /api/treatments - Solo clínica con CLINICAL_WRITE.
// La mascota sale de la visita (visitId). Campos del mockup opcionales: status, instructions.
export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  console.log('📝 POST /api/treatments - Creando tratamiento');

  const body = await request.json();

  if (!body.visitId) {
    return NextResponse.json({ success: false, message: 'El ID de la visita es requerido' }, { status: 400 });
  }

  const petId = await petIdOfVisit(body.visitId);
  if (!petId) {
    throw new NotFoundError('VISIT_NOT_FOUND', 'La visita no existe');
  }
  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  if (!body.description) {
    return NextResponse.json({ success: false, message: 'La descripción del tratamiento es requerida' }, { status: 400 });
  }

  if (!body.startDate) {
    return NextResponse.json({ success: false, message: 'La fecha de inicio es requerida' }, { status: 400 });
  }

  if (body.endDate && new Date(body.endDate) < new Date(body.startDate)) {
    return NextResponse.json(
      { success: false, message: 'La fecha de fin no puede ser menor a la fecha de inicio' },
      { status: 400 }
    );
  }

  const parsed = parseClinicExtras(!!actor.clinic, body, TREATMENT_EXTRA_FIELDS);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  const treatmentId = uuidv4();
  const treatmentData = {
    id: treatmentId,
    visit_id: body.visitId,
    description: body.description,
    start_date: body.startDate,
    end_date: body.endDate || null,
    notes: body.notes || null,
    source: authorship.source,
    veterinary_id: authorship.veterinaryId,
    prescribed_by_employee_id: authorship.employeeId,
    created_at: new Date().toISOString(),
    ...parsed.values,
  };

  const { data, error } = await createClient()
    .from('treatments')
    .insert([treatmentData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  await auditRepository.record({
    tableName: 'treatments',
    recordId: treatmentId,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  const target = await resolveEventTarget(petId, authorship);
  if (target) {
    try {
      await treatmentsPublisher.publishTreatmentStarted({
        treatmentId: treatmentId,
        petId: petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        type: body.description,
        protocol: body.protocol || 'Standard protocol',
        startedAt: body.startDate,
      });
      console.log('✅ Evento TREATMENT_STARTED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Tratamiento creado exitosamente',
    data: {
      id: data.id,
      visitId: data.visit_id,
      description: data.description,
      startDate: data.start_date,
      endDate: data.end_date,
      notes: data.notes,
      veterinaryId: data.veterinary_id,
      prescribedByEmployeeId: data.prescribed_by_employee_id,
      source: data.source,
      ...toResponse(data, TREATMENT_EXTRA_FIELDS),
      createdAt: data.created_at,
    },
  }, { status: 201 });
});
