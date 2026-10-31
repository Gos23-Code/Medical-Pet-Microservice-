import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { resolveEventTarget } from '@/src/infrastructure/clinical/event-target';
import {
  SupabaseClinicalAuditRepository,
  buildChanges,
} from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { ForbiddenError } from '@/src/infrastructure/http/api-error';
import { parseVisitClinicalFields, VISIT_CLINICAL_COLUMNS } from '@/src/application/visits/visit-clinical-fields';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';

// ✅ Obtener instancia del publisher
const visitsPublisher = createVisitsPublisher();
const auditRepository = new SupabaseClinicalAuditRepository();

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/visits/[id] - Solo la clínica con CLINICAL_WRITE (MED-03). El dueño recibe 403.
// Cualquiera de los campos clínicos de "Registrar visita" (parcial). Sin body vacío.
export const PUT = withAuth(async (request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log('📝 PUT /api/visits/[id] - Actualizando visita', id);

  const supabase = createClient();
  const body = await request.json();

  const parsed = parseVisitClinicalFields(body, !!actor.clinic);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }
  if (Object.keys(parsed.values).length === 0) {
    return NextResponse.json(
      { success: false, message: 'Debes enviar al menos un campo clínico para actualizar' },
      { status: 400 }
    );
  }

  // 1. La visita actual: de aquí sale el pet_id para autorizar
  const { data: currentVisit, error: fetchError } = await supabase
    .from('veterinary_visits')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !currentVisit) {
    console.error('❌ Error obteniendo visita:', fetchError);
    return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
  }

  const authorship = await authorizePet(actor, currentVisit.pet_id, 'CLINICAL_WRITE');

  // Solo la clínica que la creó puede corregirla
  if (currentVisit.veterinary_id && currentVisit.veterinary_id !== authorship.veterinaryId) {
    throw new ForbiddenError('TENANT_MISMATCH', 'La visita fue registrada por otra clínica');
  }

  const updateData = { ...parsed.values, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('veterinary_visits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
  }

  // Auditoría con antes/después de cada campo que se envió
  const changedKeys = Object.keys(parsed.values);
  const before = Object.fromEntries(changedKeys.map((k) => [k, currentVisit[k]]));
  await auditRepository.record({
    tableName: 'veterinary_visits',
    recordId: id,
    action: 'UPDATE',
    actorUserId: actor.userId,
    veterinaryId: authorship.veterinaryId,
    changes: buildChanges(before, parsed.values),
  });

  // ✅ VISIT_COMPLETED cuando se registra diagnóstico
  if (parsed.values[VISIT_CLINICAL_COLUMNS.diagnosis] && typeof body.diagnosis === 'string' && body.diagnosis.trim() !== '') {
    const target = await resolveEventTarget(currentVisit.pet_id, authorship);
    if (target) {
      try {
        await visitsPublisher.publishVisitCompleted({
          visitId: data.id,
          petId: currentVisit.pet_id,
          userId: target.userId,
          recipient: target.recipient,
          veterinaryId: target.veterinaryId,
          veterinaryName: target.veterinaryName,
          diagnosis: data.diagnosis || '',
          prescriptions: body.prescriptions || [],
          notes: data.notes || '',
          completedAt: new Date().toISOString(),
        });
        console.log('✅ Evento VISIT_COMPLETED publicado correctamente');
      } catch (pubsubError) {
        console.error('❌ Error publicando en Pub/Sub:', pubsubError);
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Visita actualizada exitosamente',
    data: toVisitResponse(data as VisitRow),
  });
});

// GET /api/visits/[id] - Dueño de la mascota o clínica con CLINICAL_READ (MED-03)
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log('📝 GET /api/visits/[id] - Obteniendo visita', id);

  const { data, error } = await createClient()
    .from('veterinary_visits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Un id inexistente llega como error de "no rows" de PostgREST
    if (error.code === 'PGRST116') {
      return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
    }
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
  }

  await authorizePet(actor, data.pet_id, 'CLINICAL_READ');

  return NextResponse.json({ success: true, data: toVisitResponse(data as VisitRow) });
});
