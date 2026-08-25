// app/api/treatments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';
import { GetTreatmentUseCase } from '@/src/application/use-cases/treatments/get-treatment.use-case';
import { UpdateTreatmentUseCase } from '@/src/application/use-cases/treatments/update-treatment.use-case';
import { IsActiveUseCase } from '@/src/application/use-cases/treatments/is-active.use-case';
import { TreatmentMapper } from '@/src/application/mappers/treatment.mapper';
import { UpdateTreatmentDTO } from '@/src/application/dtos/treatment.dto';
import { Treatment } from '@/src/domain/entities/treatment.entity';
import { Medication } from '@/src/domain/repositories/treatment.repository';

const repository = new SupabaseTreatmentRepository();
const getTreatmentUseCase = new GetTreatmentUseCase(repository);
const updateTreatmentUseCase = new UpdateTreatmentUseCase(repository);
const isActiveUseCase = new IsActiveUseCase(repository);

// GET /api/treatments/[id] - Obtener tratamiento completo con medicamentos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 GET /api/treatments/${id} - Obteniendo tratamiento con medicamentos`);
  
  try {
    const result = await getTreatmentUseCase.execute(id, true);
    
    let treatment: Treatment;
    let medications: Medication[] = [];
    
    if ('treatment' in result && 'medications' in result) {
      treatment = result.treatment;
      medications = result.medications;
    } else {
      treatment = result as Treatment;
    }
    
    // 👇 Convertir Medication[] a MedicationFromService[]
    const medicationsForDTO = medications.map(med => ({
      id: med.id,
      treatmentId: med.treatmentId,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      createdAt: med.createdAt.toISOString(), // Date -> string
      updatedAt: med.updatedAt.toISOString(), // Date -> string
    }));
    
    const activeStatus = await isActiveUseCase.execute(id);
    const dto = TreatmentMapper.toDTO(treatment, medicationsForDTO);
    
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
    
    const result = await getTreatmentUseCase.execute(id, true);
    
    let treatment: Treatment;
    let medications: Medication[] = [];
    
    if ('treatment' in result && 'medications' in result) {
      treatment = result.treatment;
      medications = result.medications;
    } else {
      treatment = result as Treatment;
    }
    
    // 👇 Convertir Medication[] a MedicationFromService[]
    const medicationsForDTO = medications.map(med => ({
      id: med.id,
      treatmentId: med.treatmentId,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      createdAt: med.createdAt.toISOString(), // Date -> string
      updatedAt: med.updatedAt.toISOString(), // Date -> string
    }));
    
    const activeStatus = await isActiveUseCase.execute(id);
    const dto = TreatmentMapper.toDTO(treatment, medicationsForDTO);
    
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