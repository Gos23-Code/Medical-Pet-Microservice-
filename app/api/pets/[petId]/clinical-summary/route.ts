import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { todayInTimeZone } from '@/src/shared/business-date';

// GET /api/pets/[petId]/clinical-summary
// MED-07: lo que ve recepción (CLINICAL_READ_BASIC) y lo que puede usar el IA service antes de la cita.
// El dueño también puede leerlo. Sin nombres ni datos de contacto.
export const GET = withAuth(async (_request: NextRequest, context: { params: Promise<{ petId: string }> }, actor) => {
  const { petId } = await context.params;
  await authorizePet(actor, petId, 'CLINICAL_READ_BASIC');

  const supabase = createClient();
  const today = todayInTimeZone();

  const [vaccinesRes, treatmentsRes, weightRes] = await Promise.all([
    supabase
      .from('vaccines')
      .select('id, name, application_date, next_dose_date')
      .eq('pet_id', petId),
    supabase
      .from('treatments')
      .select('id, description, start_date, end_date, veterinary_visits!inner(pet_id)')
      .eq('veterinary_visits.pet_id', petId),
    supabase
      .from('WeightRecord')
      .select('Weight, Date, Created_at')
      .eq('PetId', petId)
      .order('Created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (vaccinesRes.error || treatmentsRes.error || weightRes.error) {
    const message = vaccinesRes.error?.message ?? treatmentsRes.error?.message ?? weightRes.error?.message;
    console.error('❌ Error armando el resumen clínico:', message);
    return NextResponse.json({ success: false, message: 'No se pudo armar el resumen clínico' }, { status: 500 });
  }

  const vaccines = (vaccinesRes.data ?? []).map((vaccine) => ({
    id: vaccine.id,
    name: vaccine.name,
    applicationDate: vaccine.application_date,
    nextDoseDate: vaccine.next_dose_date,
    // Vigente: próxima dosis hoy o después. Vencida: ya pasó. Sin próxima dosis: no aplica vencimiento.
    status: !vaccine.next_dose_date
      ? 'SIN_PROXIMA_DOSIS'
      : vaccine.next_dose_date >= today
        ? 'VIGENTE'
        : 'VENCIDA',
  }));

  const activeTreatments = (treatmentsRes.data ?? [])
    .filter((treatment) => !treatment.end_date || treatment.end_date >= today)
    .map((treatment) => ({
      id: treatment.id,
      description: treatment.description,
      startDate: treatment.start_date,
      endDate: treatment.end_date,
    }));

  const lastWeight = weightRes.data
    ? { weight: weightRes.data.Weight, date: weightRes.data.Date, recordedAt: weightRes.data.Created_at }
    : null;

  return NextResponse.json({
    success: true,
    data: {
      petId,
      // Las alergias no viven en Medical todavía (decisión pendiente, AGENTS.md §10).
      // null significa "no disponible aquí", no "sin alergias".
      allergies: null,
      vaccines,
      activeTreatments,
      lastWeight,
      // La próxima cita sale de Calendar; Medical no la conoce.
      nextAppointment: null,
      generatedAt: new Date().toISOString(),
    },
  });
});
