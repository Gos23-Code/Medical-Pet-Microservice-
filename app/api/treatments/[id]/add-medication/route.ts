import { NextRequest, NextResponse } from 'next/server';
import { SupabaseMedicationRepository } from '@/src/infrastructure/database/repositories/supabase-medication-treatment.repository';
import { AddMedicationUseCase } from '@/src/application/use-cases/treatments/add-medication.use-case';
import { MedicationMapper } from '@/src/application/mappers/medication-treatment.mapper';
import { AddMedicationDTO } from '@/src/application/dtos/medication-treatment.dto';
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';
import { SupabaseTreatmentRepository } from '@/src/infrastructure/database/repositories/supabase-treatment.repository';

const repository = new SupabaseMedicationRepository();
const addMedicationUseCase = new AddMedicationUseCase(repository);
const treatmentRepository = new SupabaseTreatmentRepository();

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 POST /api/treatments/${id}/add-medication - Agregando medicamento`);
  
  try {
    const body: AddMedicationDTO = await request.json();
    
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
    
    // 1. Obtener el tratamiento para saber su nombre
    const treatment = await treatmentRepository.findById(id);
    
    if (!treatment) {
      return NextResponse.json(
        { success: false, message: 'Tratamiento no encontrado' },
        { status: 404 }
      );
    }
    
    // 2. Agregar el medicamento
    const medication = await addMedicationUseCase.execute(id, body);
    const dto = MedicationMapper.toDTO(medication);
    
    // 3. ✅ PUBLICAR EN PUB/SUB - Medicamento agregado
    console.log(`📤 Publicando evento MEDICATION_ADDED para tratamiento: ${treatment.description}...`);
    try {
      await treatmentsPublisher.publishMedicationAdded({
        treatmentId: id,
        treatmentName: treatment.description,  // ✅ Nombre del tratamiento
        petId: body.petId,
        userId: body.userId,
        medicationId: medication.id,
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        duration: body.duration,
        addedAt: new Date().toISOString(),
      });
      console.log("✅ Evento MEDICATION_ADDED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Medicamento agregado exitosamente',
      data: dto
    }, { status: 201 });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}