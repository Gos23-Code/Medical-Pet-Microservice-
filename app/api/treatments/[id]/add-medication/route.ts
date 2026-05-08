import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/repositories/supabase-medication.repository';
import { AddMedicationUseCase } from '@/src/application/use-cases/add-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication.mapper';
import { AddMedicationDTO } from '@/src/application/dtos/medication.dto';

const repository = new SupabaseMedicationRepository();
const addMedicationUseCase = new AddMedicationUseCase(repository);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(` POST /api/treatments/${id}/add-medication - addMedication()`);
  
  try {
    const body: AddMedicationDTO = await request.json();
    
    const medication = await addMedicationUseCase.execute(id, body);
    const dto = MedicationMapper.toDTO(medication);
    
    return NextResponse.json({
      success: true,
      message: 'Medicamento agregado exitosamente',
      data: dto
    }, { status: 201 });
    
  } catch (error) {
    console.error(" Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}