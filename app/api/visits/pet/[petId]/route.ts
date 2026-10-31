import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';

// GET /api/visits/pet/[petId]
// Dueño de la mascota o clínica con CLINICAL_READ (MED-03).
export const GET = withAuth(
  async (_request: NextRequest, context: { params: Promise<{ petId: string }> }, actor) => {
    const { petId } = await context.params;

    if (!petId) {
      return NextResponse.json({ success: false, message: 'El ID de la mascota es requerido' }, { status: 400 });
    }

    await authorizePet(actor, petId, 'CLINICAL_READ');

    const { data, error } = await createClient()
      .from('veterinary_visits')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error de Supabase:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const visits = (data || []).map((visit) => toVisitResponse(visit as VisitRow));

    return NextResponse.json({ success: true, data: visits, count: visits.length, petId });
  }
);
