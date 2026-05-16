import { NextRequest, NextResponse } from 'next/server';
import { GetTreatmentsByVisitUseCase } from '@/src/application/use-cases/get-treatment.use-case';

const getTreatmentsByVisitUseCase = new GetTreatmentsByVisitUseCase();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 GET /api/visits/${id}/treatment - Obteniendo tratamientos de la visita`);
  
  try {
    const treatments = await getTreatmentsByVisitUseCase.execute(id);
    
    return NextResponse.json({
      success: true,
      data: treatments,
      count: treatments.length
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}