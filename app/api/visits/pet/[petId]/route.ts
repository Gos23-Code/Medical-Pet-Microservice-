import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }
) {
  // Desempaquetar params con await
  const { petId } = await params;
  
  console.log("📝 GET /api/visits/pet/[petId] - Buscando visitas por mascota");
  console.log("🐾 ID de mascota:", petId);
  
  try {
    const supabase = createClient();
    
    // Validar que se proporcionó un petId
    if (!petId) {
      return NextResponse.json(
        { success: false, message: 'El ID de la mascota es requerido' },
        { status: 400 }
      );
    }
    
    // Buscar todas las visitas de la mascota
    const { data, error } = await supabase
      .from('veterinary_visits')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false }); // Ordenar por fecha descendente (más reciente primero)
    
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
    
    console.log(`✅ Encontradas ${visits.length} visitas para la mascota ${petId}`);
    
    return NextResponse.json({
      success: true,
      data: visits,
      count: visits.length,
      petId: petId
    });
    
  } catch (error) {
    console.error("❌ Error general:", error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}