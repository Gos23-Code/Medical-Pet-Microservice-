import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { todayInTimeZone } from '@/src/shared/business-date';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { ConflictError } from '@/src/infrastructure/http/api-error';
import { parseVisitClinicalFields } from '@/src/application/visits/visit-clinical-fields';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';

// ✅ Obtener instancia del publisher
const visitsPublisher = createVisitsPublisher();
const auditRepository = new SupabaseClinicalAuditRepository();

// POST /api/visits
// Mismo body para el dueño y la clínica en la forma; solo la clínica puede escribir (MED-03).
//   • Obligatorios: petId, reason.
//   • Opcionales (los de "Registrar visita"): date, appointmentId, veterinarian, weight, temperature,
//     heartRate, respiratoryRate, mucousMembranes, bodyConditionScore, anamnesis, physicalExam,
//     diagnosis, plan, notes.
//   • La autoría (veterinary_id, empleado, usuario) sale SIEMPRE del token.
export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  console.log('📝 POST /api/visits - Creando nueva visita');

  const supabase = createClient();
  const body = await request.json();

  const petId: string | undefined = body.petId || body.pet_id;
  if (!petId) {
    return NextResponse.json({ success: false, message: 'El ID de la mascota es requerido' }, { status: 400 });
  }

  if (!body.reason) {
    return NextResponse.json({ success: false, message: 'El motivo de la visita es requerido' }, { status: 400 });
  }

  const authorship = await authorizePet(actor, petId, 'CLINICAL_WRITE');

  const parsed = parseVisitClinicalFields(body, !!actor.clinic);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }

  // MED-04: una cita atendida produce como máximo una visita
  if (actor.clinic && body.appointmentId) {
    const { data: existing } = await supabase
      .from('veterinary_visits')
      .select('id')
      .eq('appointment_id', body.appointmentId)
      .maybeSingle();

    if (existing) {
      throw new ConflictError('APPOINTMENT_ALREADY_ATTENDED', 'Esta cita ya tiene una visita registrada');
    }
  }

  const visitData = {
    ...parsed.values,
    pet_id: petId,
    date: body.date || todayInTimeZone(),
    reason: body.reason,
    appointment_id: actor.clinic ? body.appointmentId || null : null,
    source: authorship.source,
    veterinary_id: authorship.veterinaryId,
    attended_by_employee_id: authorship.employeeId,
    attended_by_user_id: authorship.userId,
    created_by_user_id: authorship.userId,
  };

  const { data, error } = await supabase
    .from('veterinary_visits')
    .insert([visitData])
    .select()
    .single();

  if (error) {
    // Carrera entre dos peticiones con la misma cita: la restricción única la detiene
    if (error.code === '23505') {
      throw new ConflictError('APPOINTMENT_ALREADY_ATTENDED', 'Esta cita ya tiene una visita registrada');
    }
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  await auditRepository.record({
    tableName: 'veterinary_visits',
    recordId: data.id,
    action: 'CREATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
  });

  // ✅ PUBLICAR EN PUB/SUB - Visita programada (el destinatario es el dueño, resuelto en Pets)
  const target = await resolveEventTarget(petId, authorship);
  if (target) {
    try {
      await visitsPublisher.publishVisitScheduled({
        visitId: data.id,
        petId: petId,
        userId: target.userId,
        recipient: target.recipient,
        veterinaryId: target.veterinaryId,
        veterinaryName: target.veterinaryName,
        scheduledDate: data.date,
        reason: data.reason,
        veterinarian: data.veterinarian ?? '',
      });
      console.log('✅ Evento VISIT_SCHEDULED publicado correctamente');
    } catch (pubsubError) {
      console.error('❌ Error publicando en Pub/Sub:', pubsubError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Visita creada exitosamente',
    data: toVisitResponse(data as VisitRow),
  }, { status: 201 });
});
