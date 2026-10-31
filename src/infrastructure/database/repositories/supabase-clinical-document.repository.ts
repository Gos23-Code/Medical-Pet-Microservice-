import { createClient } from '@/src/infrastructure/database/supabase/client';
import { ClinicalDocument, ClinicalDocumentType } from '@/src/domain/entities/clinical-document.entity';
import { ClinicalDocumentRepository } from '@/src/domain/repositories/clinical-document.repository';

// Tabla clinical_documents (db/scripts/004_alinear_tablas_con_mockup.sql).

interface DocumentRow {
  id: string;
  pet_id: string;
  visit_id: string | null;
  surgery_id: string | null;
  lab_test_id: string | null;
  document_type: string;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  source: 'CLINIC';
  veterinary_id: string;
  uploaded_by_user_id: string;
  created_at: string;
}

function toDomain(row: DocumentRow): ClinicalDocument {
  return {
    id: row.id,
    petId: row.pet_id,
    visitId: row.visit_id,
    surgeryId: row.surgery_id,
    labTestId: row.lab_test_id,
    documentType: row.document_type as ClinicalDocumentType,
    title: row.title,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    source: row.source,
    veterinaryId: row.veterinary_id,
    uploadedByUserId: row.uploaded_by_user_id,
    createdAt: row.created_at,
  };
}

export class SupabaseClinicalDocumentRepository implements ClinicalDocumentRepository {
  async insert(document: ClinicalDocument): Promise<void> {
    const { error } = await createClient().from('clinical_documents').insert([
      {
        id: document.id,
        pet_id: document.petId,
        visit_id: document.visitId,
        surgery_id: document.surgeryId,
        lab_test_id: document.labTestId,
        document_type: document.documentType,
        title: document.title,
        storage_path: document.storagePath,
        mime_type: document.mimeType,
        size_bytes: document.sizeBytes,
        source: document.source,
        veterinary_id: document.veterinaryId,
        uploaded_by_user_id: document.uploadedByUserId,
        created_at: document.createdAt,
      },
    ]);
    if (error) throw new Error(`Error guardando el documento: ${error.message}`);
  }

  async findById(id: string): Promise<ClinicalDocument | null> {
    const { data, error } = await createClient()
      .from('clinical_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`Error buscando el documento: ${error.message}`);
    return data ? toDomain(data as DocumentRow) : null;
  }

  async listByPet(petId: string): Promise<ClinicalDocument[]> {
    const { data, error } = await createClient()
      .from('clinical_documents')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Error listando documentos: ${error.message}`);
    return (data ?? []).map((row) => toDomain(row as DocumentRow));
  }

  async delete(id: string): Promise<void> {
    const { error } = await createClient().from('clinical_documents').delete().eq('id', id);
    if (error) throw new Error(`Error borrando el documento: ${error.message}`);
  }
}
