import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  console.log("📝 POST /api/treatments - Creando tratamiento");
  
  try {
    const supabase = createClient();
    const body = await request.json();
    
    console.log("📦 Body recibido:", body);
    
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
    
    // Preparar datos - SIN updated_at
    const treatmentData = {
      id: uuidv4(),
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