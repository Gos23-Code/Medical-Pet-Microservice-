import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  console.log("📝 GET /api/visits/date-range - Buscando visitas por rango de fechas");
  
  try {
    const supabase = createClient();
    
    // Obtener parámetros de la URL
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log("📅 Fecha inicio:", startDate);
    console.log("📅 Fecha fin:", endDate);
    
    // Validar que se proporcionaron ambas fechas
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Se requieren startDate y endDate. Ejemplo: ?startDate=2024-01-01&endDate=2024-12-31' 
        },
        { status: 400 }
      );
    }
    
    // Validar que startDate sea menor o igual a endDate
    if (startDate > endDate) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'La fecha de inicio debe ser menor o igual a la fecha de fin' 
        },
        { status: 400 }
      );
    }
    
    // Buscar visitas en el rango de fechas
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .gte('date', startDate)  // greater than or equal (mayor o igual)
      .lte('date', endDate)    // less than or equal (menor o igual)
      .order('date', { ascending: false }); // Ordenar por fecha descendente
    
    if (error) {
      console.error("❌ Error de Supabase:", error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    // Transformar los datos al formato de respuesta
    const visits = (data || []).map(visit => ({
      id: visit.id,
      petId: visit.pet_id,
      date: visit.date,
      reason: visit.reason,
      diagnosis: visit.diagnosis,
      veterinarian: visit.veterinarian,
      notes: visit.notes,
      weight: visit.weight,
      temperature: visit.temperature,
      createdAt: visit.created_at,
      updatedAt: visit.updated_at,
    }));
    
    console.log(`✅ Encontradas ${visits.length} visitas entre ${startDate} y ${endDate}`);
    
    return NextResponse.json({
      success: true,
      data: visits,
      count: visits.length,
      dateRange: {
        startDate: startDate,
        endDate: endDate
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