import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { createTreatmentsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

// ✅ Obtener instancia del publisher
const treatmentsPublisher = createTreatmentsPublisher();

export async function POST(request: NextRequest) {
  console.log("📝 POST /api/treatments - Creando tratamiento");
  
  try {
    const supabase = createClient();
    const body = await request.json();
    
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
    
    // Validaciones
    if (!body.visitId) {
      return NextResponse.json(
        { success: false, message: 'El ID de la visita es requerido' },
        { status: 400 }
      );
    }
    
    if (!body.description) {
      return NextResponse.json(
        { success: false, message: 'La descripción del tratamiento es requerida' },
        { status: 400 }
      );
    }
    
    if (!body.startDate) {
      return NextResponse.json(
        { success: false, message: 'La fecha de inicio es requerida' },
        { status: 400 }
      );
    }
    
    // Validar que endDate no sea menor a startDate
    if (body.endDate && new Date(body.endDate) < new Date(body.startDate)) {
      return NextResponse.json(
        { success: false, message: 'La fecha de fin no puede ser menor a la fecha de inicio' },
        { status: 400 }
      );
    }
    
    // Preparar datos
    const treatmentId = uuidv4();
    const treatmentData = {
      id: treatmentId,
      visit_id: body.visitId,
      description: body.description,
      start_date: body.startDate,
      end_date: body.endDate || null,
      notes: body.notes || null,
      created_at: new Date().toISOString(),
    };
    
    console.log("💾 Guardando tratamiento:", treatmentData);
    
    const { data, error } = await supabase
      .from('treatments')
      .insert([treatmentData])
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error de Supabase:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    // ✅ PUBLICAR EN PUB/SUB - Tratamiento iniciado
    console.log("📤 Publicando evento TREATMENT_STARTED...");
    try {
      await treatmentsPublisher.publishTreatmentStarted({
        treatmentId: treatmentId,
        petId: body.petId,
        userId: body.userId,
        type: body.description,
        protocol: body.protocol || 'Standard protocol',
        startedAt: body.startDate,
      });
      console.log("✅ Evento TREATMENT_STARTED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tratamiento creado exitosamente',
      data: {
        id: data.id,
        visitId: data.visit_id,
        description: data.description,
        startDate: data.start_date,
        endDate: data.end_date,
        notes: data.notes,
        createdAt: data.created_at,
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error("❌ Error general:", error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}