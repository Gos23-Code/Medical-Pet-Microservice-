// src/app/api/pet-surgery/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { UpdateSurgeryUseCase } from '@/src/application/use-cases/surgery/update-surgery.use-case';
import { DeleteSurgeryUseCase } from '@/src/application/use-cases/surgery/delete-surgery.use-case';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);
const updateSurgeryUseCase = new UpdateSurgeryUseCase(repository);
const deleteSurgeryUseCase = new DeleteSurgeryUseCase(repository);

// GET /api/pet-surgery/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // En Next.js 15, params es una Promise que debe ser resuelta
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }
    
    const surgery = await getSurgeriesUseCase.getById(id);
    
    return NextResponse.json({ 
      success: true, 
      data: surgery.toJSON() 
    });
    
  } catch (error) {
    console.error('Error fetching surgery:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('not found') ? 404 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

// PUT /api/pet-surgery/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const surgery = await updateSurgeryUseCase.execute({
      id: id,
      title: body.title,
      description: body.description,
      surgeryDate: body.surgeryDate ? new Date(body.surgeryDate) : undefined,
      durationMinutes: body.durationMinutes,
      anesthesiaUsed: body.anesthesiaUsed,
      complications: body.complications,
      postOpInstructions: body.postOpInstructions,
      outcome: body.outcome,
      status: body.status,
      nextCheckupDate: body.nextCheckupDate ? new Date(body.nextCheckupDate) : undefined,
    });
    
    return NextResponse.json({ 
      success: true, 
      data: surgery.toJSON(),
      message: 'Surgery updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating surgery:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('not found') ? 404 : 400;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

// PATCH /api/pet-surgery/[id] - Actualizar solo el estado
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }
    
    const { status, outcome } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    const surgery = await updateSurgeryUseCase.updateStatus({
      id: id,
      status,
      outcome
    });
    
    return NextResponse.json({ 
      success: true, 
      data: surgery.toJSON(),
      message: 'Surgery status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating surgery status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('not found') ? 404 : 400;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

// DELETE /api/pet-surgery/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Surgery ID is required' },
        { status: 400 }
      );
    }
    
    await deleteSurgeryUseCase.execute(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Surgery deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting surgery:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('not found') ? 404 : 400;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}