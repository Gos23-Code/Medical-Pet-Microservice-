import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DocumentStorage } from '@/src/domain/repositories/clinical-document.repository';

// Bucket PRIVADO "clinical-documents" (se crea con 004 o a mano en Storage). Nunca hay URL pública:
// cada lectura genera una URL firmada de corta duración.
//
// Clave: subir y firmar en un bucket privado necesita la service role key (SUPABASE_SERVICE_ROLE_KEY).
// Con la anon key sin políticas de Storage, las subidas fallan. La service role key es secreta:
// solo en runtime, nunca con prefijo NEXT_PUBLIC_.

export const CLINICAL_DOCUMENTS_BUCKET = 'clinical-documents';

export class SupabaseDocumentStorage implements DocumentStorage {
  private client: SupabaseClient | null = null;

  private storage() {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o la clave de Supabase para Storage');
      }
      this.client = createClient(url, key, { auth: { persistSession: false } });
    }
    return this.client.storage.from(CLINICAL_DOCUMENTS_BUCKET);
  }

  async upload(path: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    const { error } = await this.storage().upload(path, bytes, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`Error subiendo el archivo: ${error.message}`);
  }

  async createSignedUrl(path: string, ttlSeconds: number): Promise<string> {
    const { data, error } = await this.storage().createSignedUrl(path, ttlSeconds);
    if (error || !data) throw new Error(`Error firmando el archivo: ${error?.message ?? 'sin URL'}`);
    return data.signedUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.storage().remove([path]);
    if (error) throw new Error(`Error borrando el archivo: ${error.message}`);
  }
}
