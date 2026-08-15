// instrumentation.ts (en la raíz del proyecto)
export async function register() {
  // Este archivo es opcional y se ejecuta al inicio del servidor
  // Puedes usarlo para configurar monitoreo, logging, etc.
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Servidor iniciado en modo:', process.env.NODE_ENV);
  }
}