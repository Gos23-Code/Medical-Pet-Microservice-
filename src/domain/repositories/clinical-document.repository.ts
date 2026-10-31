import { ClinicalDocument } from '@/src/domain/entities/clinical-document.entity';

// Puertos del módulo de documentos: la base de datos (metadatos) y el almacenamiento privado (archivos).

export interface ClinicalDocumentRepository {
  insert(document: ClinicalDocument): Promise<void>;
  findById(id: string): Promise<ClinicalDocument | null>;
  listByPet(petId: string): Promise<ClinicalDocument[]>;
  delete(id: string): Promise<void>;
}

export interface DocumentStorage {
  upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  /** URL firmada y temporal para ver o descargar el archivo. */
  createSignedUrl(path: string, ttlSeconds: number): Promise<string>;
  remove(path: string): Promise<void>;
}
