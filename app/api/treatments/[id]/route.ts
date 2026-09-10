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
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const repository = new SupabaseTreatmentRepository();
const getTreatmentUseCase = new GetTreatmentUseCase(repository);
const updateTreatmentUseCase = new UpdateTreatmentUseCase(repository);
const isActiveUseCase = new IsActiveUseCase(repository);

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();

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
    
    const medicationsForDTO = medications.map(med => ({
      id: med.id,
      treatmentId: med.treatmentId,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      createdAt: med.createdAt.toISOString(),
      updatedAt: med.updatedAt.toISOString(),
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

// PUT /api/treatments/[id] - Actualizar tratamiento (fechas y notas)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log(`📝 PUT /api/treatments/${id} - Actualizando tratamiento`);
  
  try {
    const body: UpdateTreatmentDTO = await request.json();
    
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
    
    // 1. Obtener el tratamiento actual para comparar cambios
    const currentResult = await getTreatmentUseCase.execute(id, false);
    const currentTreatment = currentResult as Treatment;
    
    // 2. Detectar cambios
    const hasEndDateAdded = body.endDate && !currentTreatment.endDate;
    const hasNotesChanged = body.notes !== undefined && body.notes !== currentTreatment.notes;
    const hasStartDateChanged = body.startDate !== undefined && body.startDate !== currentTreatment.startDate.toISOString().split('T')[0];
    const hasEndDateChanged = body.endDate !== undefined && body.endDate !== (currentTreatment.endDate?.toISOString().split('T')[0] || null);
    
    console.log("🔍 Cambios detectados:", {
      hasEndDateAdded,
      hasNotesChanged,
      hasStartDateChanged,
      hasEndDateChanged,
    });
    
    // 3. ✅ Actualizar el tratamiento
    await updateTreatmentUseCase.execute(id, {
      userId: body.userId,
      petId: body.petId,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
    });
    
    // 4. Obtener el tratamiento actualizado
    const result = await getTreatmentUseCase.execute(id, true);
    
    let treatment: Treatment;
    let medications: Medication[] = [];
    
    if ('treatment' in result && 'medications' in result) {
      treatment = result.treatment;
      medications = result.medications;
    } else {
      treatment = result as Treatment;
    }
    
    // 5. Obtener estado activo con progreso
    const activeStatus = await isActiveUseCase.execute(id);
    
    // 6. ✅ NOTIFICACIONES
    let notificationSent = false;
    
    // 6a. Si se agregó endDate manualmente (tratamiento completado)
    if (hasEndDateAdded) {
      console.log("📤 Publicando evento TREATMENT_COMPLETED (endDate agregado manualmente)...");
      try {
        await treatmentsPublisher.publishTreatmentCompleted({
          treatmentId: id,
          petId: body.petId,
          userId: body.userId,
          outcome: 'completed',
          completedAt: new Date().toISOString(),
        });
        console.log("✅ Evento TREATMENT_COMPLETED publicado correctamente");
        notificationSent = true;
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }
    }
    
    // 6b. ✅ Si el progreso llegó al 100% (ACTIVE_LAST_DAY o EXPIRED) - NUEVO
    if (!notificationSent && activeStatus.progress === 100) {
      const outcome = activeStatus.status === 'EXPIRED' ? 'expired' : 'completed';
      console.log(`📤 Publicando evento TREATMENT_COMPLETED (progreso 100% - ${activeStatus.status})...`);
      try {
        await treatmentsPublisher.publishTreatmentCompleted({
          treatmentId: id,
          petId: body.petId,
          userId: body.userId,
          outcome: outcome,
          completedAt: new Date().toISOString(),
        });
        console.log(`✅ Evento TREATMENT_COMPLETED publicado correctamente (${outcome})`);
        notificationSent = true;
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }
    }
    
    // 6c. Si se actualizaron notas (evolución del tratamiento) y no se envió notificación antes
    if (hasNotesChanged && !notificationSent) {
      console.log("📤 Publicando evento TREATMENT_UPDATED...");
      try {
        await treatmentsPublisher.publishTreatmentUpdated({
          treatmentId: id,
          petId: body.petId,
          userId: body.userId,
          progress: activeStatus.progress || 0,
          status: activeStatus.status || 'in_progress',
          updatedAt: new Date().toISOString(),
        });
        console.log("✅ Evento TREATMENT_UPDATED publicado correctamente");
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }
    }
    
    // 7. Si solo se actualizaron fechas (sin notas), no se envía notificación
    if ((hasStartDateChanged || hasEndDateChanged) && !hasNotesChanged && !hasEndDateAdded && activeStatus.progress !== 100) {
      console.log("ℹ️ Solo se actualizaron fechas - sin notificación (el progreso se recalcula automáticamente)");
    }
    
    const medicationsForDTO = medications.map(med => ({
      id: med.id,
      treatmentId: med.treatmentId,
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      createdAt: med.createdAt.toISOString(),
      updatedAt: med.updatedAt.toISOString(),
    }));
    
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