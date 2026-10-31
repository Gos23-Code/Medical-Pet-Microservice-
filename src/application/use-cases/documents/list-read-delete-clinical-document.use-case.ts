import { ClinicalDocument } from '@/src/domain/entities/clinical-document.entity';
import { ClinicalDocumentRepository, DocumentStorage } from '@/src/domain/repositories/clinical-document.repository';
import { SIGNED_URL_TTL_SECONDS } from './document-rules';

// Listar, leer (URL firmada) y borrar documentos. Cada caso recibe la autorización como
// función: la decide la ruta con authorizePet, para que el caso de uso no conozca HTTP ni tokens.

export class ListClinicalDocumentsUseCase {
  constructor(private readonly repository: ClinicalDocumentRepository) {}

  execute(petId: string): Promise<ClinicalDocument[]> {
    return this.repository.listByPet(petId);
  }
}

export class ReadClinicalDocumentUseCase {
  constructor(
    private readonly repository: ClinicalDocumentRepository,
    private readonly storage: DocumentStorage
  ) {}

  /** `authorize` recibe la mascota del documento y lanza si el actor no puede verlo. */
  async execute(
    id: string,
    authorize: (petId: string) => Promise<unknown>
  ): Promise<{ document: ClinicalDocument; url: string; expiresInSeconds: number } | null> {
    const document = await this.repository.findById(id);
    if (!document) return null;

    await authorize(document.petId);

    const url = await this.storage.createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS);
    return { document, url, expiresInSeconds: SIGNED_URL_TTL_SECONDS };
  }
}

export class DeleteClinicalDocumentUseCase {
  constructor(
    private readonly repository: ClinicalDocumentRepository,
    private readonly storage: DocumentStorage
  ) {}

  /**
   * Solo la clínica que subió el documento puede borrarlo (contrato: "solo se elimina lo que subió tu clínica").
   * Devuelve false si no existe; lanza DocumentForbiddenError si es de otra clínica.
   */
  async execute(
    id: string,
    veterinaryId: string,
    authorize: (petId: string) => Promise<unknown>
  ): Promise<boolean> {
    const document = await this.repository.findById(id);
    if (!document) return false;

    await authorize(document.petId);

    if (document.veterinaryId !== veterinaryId) {
      throw new DocumentForbiddenError('Solo la clínica que subió el documento puede borrarlo');
    }

    await this.repository.delete(id);
    await this.storage.remove(document.storagePath).catch((error) =>
      console.error('❌ Documento borrado de la base pero no del bucket:', document.storagePath, error)
    );
    return true;
  }
}

export class DocumentForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentForbiddenError';
  }
}
