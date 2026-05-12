import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/repositories/supabase-treatment.repository';
import { GetTreatmentUseCase } from '@/src/application/use-cases/get-treatment.use-case';
import { UpdateTreatmentUseCase } from '@/src/application/use-cases/update-treatment.use-case';
import { GetMedicationsUseCase } from '@/src/application/use-cases/get-medication.use-case';
import { IsActiveUseCase } from '@/src/application/use-cases/is-active.use-case';
import { TreatmentMapper } from '@/src/application/mappers/treatment.mapper';
import { UpdateTreatmentDTO } from '@/src/application/dtos/treatment.dto';

const repository = new SupabaseTreatmentRepository();
const getTreatmentUseCase = new GetTreatmentUseCase(repository);
const updateTreatmentUseCase = new UpdateTreatmentUseCase(repository);
const getMedicationsUseCase = new GetMedicationsUseCase();
const isActiveUseCase = new IsActiveUseCase(repository);

// GET /api/treatments/[id] - Obtener tratamiento completo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 GET /api/treatments/${id} - Obteniendo tratamiento completo`);
  
  try {
    const treatment = await getTreatmentUseCase.execute(id);
    const medications = await getMedicationsUseCase.execute(id);
    const activeStatus = await isActiveUseCase.execute(id);
    
    const dto = TreatmentMapper.toDTO(treatment, medications);
    
    return NextResponse.json({
      success: true,
      data: {
        ...dto,
        isActive: activeStatus.isActive,
        activeStatus: {
          status: activeStatus.status,
          message: activeStatus.message,
        }
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

// PUT /api/treatments/[id] - Actualizar tratamiento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 PUT /api/treatments/${id} - Actualizando tratamiento`);
  
  try {
    const body: UpdateTreatmentDTO = await request.json();
    
    await updateTreatmentUseCase.execute(id, body);
    
    const updatedTreatment = await getTreatmentUseCase.execute(id);
    const medications = await getMedicationsUseCase.execute(id);
    const activeStatus = await isActiveUseCase.execute(id);
    const dto = TreatmentMapper.toDTO(updatedTreatment, medications);
    
    return NextResponse.json({
      success: true,
      message: 'Tratamiento actualizado exitosamente',
      data: {
        ...dto,
        isActive: activeStatus.isActive,
        activeStatus: {
          status: activeStatus.status,
          message: activeStatus.message,
        }
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