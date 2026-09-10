import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { createVisitsPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

// ✅ Obtener instancia del publisher
const visitsPublisher = createVisitsPublisher();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Desempaquetar params con await
  const { id } = await params;
  
  console.log("📝 PUT /api/visits/[id] - Actualizando visita");
  console.log("🆔 ID:", id);
  
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
    
    // Validar que hay datos para actualizar
    if (!body.diagnosis && !body.notes) {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar diagnosis o notes para actualizar' },
        { status: 400 }
      );
    }
    
    // 1. Obtener la visita actual para saber petId y userId
    const { data: currentVisit, error: fetchError } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !currentVisit) {
      console.error("❌ Error obteniendo visita:", fetchError);
      return NextResponse.json(
        { success: false, message: 'Visita no encontrada' },
        { status: 404 }
      );
    }
    
    // Preparar datos para actualizar
    const updateData: { 
      diagnosis?: string | null; 
      notes?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString()
    };
    
    if (body.diagnosis !== undefined) {
      updateData.diagnosis = body.diagnosis || null;
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }
    
    console.log("💾 Actualizando en Supabase:", updateData);
    
    // Actualizar en Supabase
    const { data, error } = await supabase
      .from('veterinary_visits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("❌ Error de Supabase:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    if (!data) {
      console.log("❌ Visita no encontrada con ID:", id);
      return NextResponse.json(
        { success: false, message: 'Visita no encontrada' },
        { status: 404 }
      );
    }
    
    console.log("✅ Visita actualizada:", data.id);

    // ✅ PUBLICAR EN PUB/SUB - Visita completada (si se agregó diagnóstico)
    if (body.diagnosis) {
      console.log("📤 Publicando evento VISIT_COMPLETED...");
      try {
        await visitsPublisher.publishVisitCompleted({
          visitId: data.id,
          petId: currentVisit.pet_id,
          userId: body.userId,
          diagnosis: data.diagnosis || '',
          prescriptions: body.prescriptions || [],
          notes: data.notes || '',
          completedAt: new Date().toISOString(),
        });
        console.log("✅ Evento VISIT_COMPLETED publicado correctamente");
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }
    } else {
      console.log("ℹ️ No se publicó evento porque no se agregó diagnóstico");
    }
    
    return NextResponse.json({
      success: true,
      message: 'Visita actualizada exitosamente',
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
    });
    
  } catch (error) {
    console.error("❌ Error general:", error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET para obtener una visita específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log("📝 GET /api/visits/[id] - Obteniendo visita");
  console.log("🆔 ID:", id);
  
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("❌ Error de Supabase:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Visita no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
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
    });
    
  } catch (error) {
    console.error("❌ Error general:", error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}