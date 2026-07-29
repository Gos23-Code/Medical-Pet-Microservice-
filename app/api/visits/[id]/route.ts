import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';

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
    
    // Validar que hay datos para actualizar
    if (!body.diagnosis && !body.notes) {
      return NextResponse.json(
        { success: false, message: 'Debes proporcionar diagnosis o notes para actualizar' },
        { status: 400 }
      );
    }
    
    // Preparar datos para actualizar (incluyendo updated_at SOLO aquí)
    const updateData: { 
      diagnosis?: string | null; 
      notes?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString() // Solo se actualiza en PUT
    };
    
    if (body.diagnosis !== undefined) {
      updateData.diagnosis = body.diagnosis || null;
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }
    
    console.log("💾 Actualizando en Supabase:", updateData);
    console.log("🔍 Buscando visita con ID:", id);
    
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
    console.log("📅 updated_at:", data.updated_at);
    
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
        updatedAt: data.updated_at, // Ahora tendrá la fecha de actualización
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