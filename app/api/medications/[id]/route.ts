import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication.repository';
import { UpdateMedicationUseCase } from '@/src/application/use-cases/medications/update-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication.mapper';
import { UpdateMedicationDTO } from '@/src/application/dtos/medication.dto';

const repository = new SupabaseMedicationRepository();
const updateMedicationUseCase = new UpdateMedicationUseCase(repository);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 PUT /api/medications/${id} - Actualizando medicación`);
  
  try {
    const body: UpdateMedicationDTO = await request.json();
    
    if (!body.dosage && !body.frequency) {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar dosage o frequency para actualizar' },
        { status: 400 }
      );
    }
    
    await updateMedicationUseCase.execute(id, body);
    
    // Obtener la medicación actualizada
    const updatedMedication = await repository.findById(id);
    const dto = updatedMedication ? MedicationMapper.toDTO(updatedMedication) : null;
    
    return NextResponse.json({
      success: true,
      message: 'Medicación actualizada exitosamente',
      data: dto
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 GET /api/medications/${id} - Obteniendo medicación`);
  
  try {
    const medication = await repository.findById(id);
    
    if (!medication) {
      return NextResponse.json(
        { success: false, message: 'Medicación no encontrada' },
        { status: 404 }
      );
    }
    
    const dto = MedicationMapper.toDTO(medication);
    
    return NextResponse.json({
      success: true,
      data: dto
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}