import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/repositories/supabase-treatment.repository';
import { IsActiveUseCase } from '@/src/application/use-cases/is-active.use-case';

const repository = new SupabaseTreatmentRepository();
const isActiveUseCase = new IsActiveUseCase(repository);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 GET /api/treatments/${id}/is-active - Verificando si está activo`);
  
  try {
    const result = await isActiveUseCase.execute(id);
    
    return NextResponse.json({
      success: true,
      data: {
        treatmentId: id,
        isActive: result.isActive,
        status: result.status,
        message: result.message,
        checkedAt: new Date().toISOString(),
      }
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}