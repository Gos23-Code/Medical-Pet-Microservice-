// app/api/vaccines/[id]/due/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { CheckVaccineDueUseCase } from '@/src/application/use-cases/vaccine/check-vaccine.use-case';

const vaccineRepository = new VaccineRepository();

// GET /api/vaccines/{id}/due - Verificar si está vencida
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // En Next.js 15+, params puede ser una Promise
    const { id } = await params;
    
    console.log('📥 ID recibido:', id); // Para debugging
    
    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la vacuna es requerido' },
        { status: 400 }
      );
    }

    const checkVaccineDueUseCase = new CheckVaccineDueUseCase(vaccineRepository);
    const result = await checkVaccineDueUseCase.execute(id);

    return NextResponse.json({
      id: result.id,
      name: result.name,
      isDue: result.isDue,
      daysUntilDue: result.daysUntilDue,
      nextDoseDate: result.nextDoseDate,
      applicationDate: result.applicationDate
    });
    
  } catch (error) {
    console.error('❌ Error en GET /api/vaccines/[id]/due:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al verificar estado de la vacuna' },
      { status: 400 }
    );
  }
}