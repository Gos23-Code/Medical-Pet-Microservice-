import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication.repository';
import { UpdateMedicationUseCase } from '@/src/application/use-cases/medications/update-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication.mapper';
import { UpdateMedicationDTO } from '@/src/application/dtos/medication.dto';
import { createMedicationsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';

const repository = new SupabaseMedicationRepository();
const updateMedicationUseCase = new UpdateMedicationUseCase(repository);
const treatmentRepository = new SupabaseTreatmentRepository();

// ✅ Obtener instancia del publisher
const medicationsPublisher = createMedicationsPublisher();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 PUT /api/medications/${id} - Actualizando medicación`);
  
  try {
    const body: UpdateMedicationDTO = await request.json();
    
    console.log("📦 Body recibido:", body);
    
    // ✅ Validar userId (necesario para notificaciones)
    if (!body.userId) {
      return NextResponse.json(
        { success: false, message: 'userId es requerido para notificaciones' },
        { status: 400 }
      );
    }

    // ✅ Validar petId (necesario para notificaciones)
    if (!body.petId) {
      return NextResponse.json(
        { success: false, message: 'petId es requerido para notificaciones' },
        { status: 400 }
      );
    }
    
    // 1. Obtener la medicación actual para comparar cambios
    const currentMedication = await repository.findById(id);
    
    if (!currentMedication) {
      return NextResponse.json(
        { success: false, message: 'Medicación no encontrada' },
        { status: 404 }
      );
    }
    
    // 2. ✅ Detectar qué campos se están actualizando (convertir a string para comparar)
    const currentDosage = currentMedication.dosage?.toString() || '';
    const newDosage = body.dosage?.toString() || '';
    const currentFrequency = currentMedication.frequency?.toString() || '';
    const newFrequency = body.frequency?.toString() || '';
    
    const dosageChanged = body.dosage !== undefined && newDosage !== currentDosage;
    const frequencyChanged = body.frequency !== undefined && newFrequency !== currentFrequency;
    
    // Validar que hay al menos un campo para actualizar
    if (!dosageChanged && !frequencyChanged) {
      return NextResponse.json(
        { success: false, message: 'No hay cambios para actualizar' },
        { status: 400 }
      );
    }
    
    // 3. Obtener el tratamiento para saber su nombre
    const treatment = await treatmentRepository.findById(currentMedication.treatmentId);
    
    // 4. Actualizar la medicación
    await updateMedicationUseCase.execute(id, body);
    
    // 5. Obtener la medicación actualizada
    const updatedMedication = await repository.findById(id);
    const dto = updatedMedication ? MedicationMapper.toDTO(updatedMedication) : null;
    
    // 6. ✅ PUBLICAR EN PUB/SUB - Si se actualizó la dosis o frecuencia
    if (dosageChanged || frequencyChanged) {
      // Construir mensaje de cambio
      let changeMessage = '';
      if (dosageChanged && frequencyChanged) {
        changeMessage = `dosis a "${newDosage}" y frecuencia a "${newFrequency}"`;
      } else if (dosageChanged) {
        changeMessage = `dosis a "${newDosage}"`;
      } else if (frequencyChanged) {
        changeMessage = `frecuencia a "${newFrequency}"`;
      }
      
      console.log(`📤 Publicando evento MEDICATION_UPDATED (${changeMessage})...`);
      
      try {
        await medicationsPublisher.publishMedicationUpdated({
          medicationId: id,
          treatmentId: currentMedication.treatmentId,
          treatmentName: treatment?.description || 'tratamiento',
          petId: body.petId,
          userId: body.userId,
          name: currentMedication.name,
          oldDosage: currentDosage,
          newDosage: newDosage,
          oldFrequency: currentFrequency,
          newFrequency: newFrequency,
          changeMessage: changeMessage,
          updatedAt: new Date().toISOString(),
        });
        console.log("✅ Evento MEDICATION_UPDATED publicado correctamente");
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }
    }
    
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