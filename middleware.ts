import { NextRequest, NextResponse } from "next/server";

// Ajusta esto a los orígenes reales que van a llamar a esta API
// (el front, el gateway, u otros microservicios). Usa "*" solo mientras
// pruebas; en producción es mejor listar los orígenes exactos.
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

function withCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export function middleware(request: NextRequest) {
  // Responder directo a las peticiones "preflight" del navegador
  if (request.method === "OPTIONS") {
    return withCorsHeaders(new NextResponse(null, { status: 204 }));
  }

  return withCorsHeaders(NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
