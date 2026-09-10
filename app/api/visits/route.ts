import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

// ✅ Obtener instancia del publisher
const visitsPublisher = createVisitsPublisher();

export async function POST(request: NextRequest) {
  console.log("📝 POST /api/visits - Creando nueva visita");
  
  try {
    const supabase = createClient();
    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.petId && !body.pet_id) {
      return NextResponse.json(
        { success: false, message: 'El ID de la mascota es requerido' },
        { status: 400 }
      );
    }
    
    if (!body.reason) {
      return NextResponse.json(
        { success: false, message: 'El motivo de la visita es requerido' },
        { status: 400 }
      );
    }
    
    if (!body.veterinarian) {
      return NextResponse.json(
        { success: false, message: 'El nombre del veterinario es requerido' },
        { status: 400 }
      );
    }

    // ✅ Validar userId (necesario para notificaciones)
    if (!body.userId) {
      return NextResponse.json(
        { success: false, message: 'userId es requerido para notificaciones' },
        { status: 400 }
      );
    }
    
    // Preparar datos para Supabase
    const petId = body.petId || body.pet_id;
    const visitData = {
      pet_id: petId,
      date: body.date || new Date().toISOString().split('T')[0],
      reason: body.reason,
      diagnosis: body.diagnosis || null,
      veterinarian: body.veterinarian,
      notes: body.notes || null,
      weight: body.weight || null,
      temperature: body.temperature || null,
    };
    
    console.log("💾 Guardando en Supabase:", visitData);
    
    const { data, error } = await supabase
      .from('veterinary_visits')
      .insert([visitData])
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error de Supabase:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    console.log("✅ Visita creada:", data.id);

    // ✅ PUBLICAR EN PUB/SUB - Visita programada
    console.log("📤 Publicando evento VISIT_SCHEDULED...");
    try {
      await visitsPublisher.publishVisitScheduled({
        visitId: data.id,
        petId: petId,
        userId: body.userId,
        scheduledDate: data.date,
        reason: data.reason,
        veterinarian: data.veterinarian,
      });
      console.log("✅ Evento VISIT_SCHEDULED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Visita creada exitosamente',
      data: {
        id: data.id,
        petId: data.pet_id,
        date: data.date,
        reason: data.reason,
        diagnosis: data.diagnosis,
        veterinarian: data.veterinarian,
        notes: data.notes,
        weight: data.weight,
        temperature: data.temperature,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
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