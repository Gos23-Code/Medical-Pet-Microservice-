// Servicios simulados para probar Medical en LOCAL. NO es para producción.
//
// Un solo puerto sirve lo que Medical pide a otros microservicios:
//   • JWKS del User service      GET /.well-known/jwks.json           (MED-01)
//   • Pets                        GET /internal/pets/:id/owner/:userId (PETS-04)
//                                 POST /internal/pets/batch           (PETS-04)
//   • Veterinary                  GET /internal/veterinaries/:v/patients/:p/access (VET-29)
//                                 GET /internal/veterinaries/:v/summary            (MED-06)
//
// Uso:  node scripts/dev-auth/stub-services.mjs
// Imprime tres tokens firmados (dueño, clínica, otro dueño) y las variables para .env.local.

import http from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const PORT = Number(process.env.STUB_PORT ?? 8099);
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'dev-internal-key';
const ISSUER = 'myanimalog-user-service';
const AUDIENCE = 'myanimalog-api';

// Datos fijos de prueba (UUID válidos)
export const IDS = {
  owner: '00000000-0000-4000-8000-000000000001', // dueño de Max
  otherOwner: '00000000-0000-4000-8000-000000000009', // dueño que NO es de Max
  vetUser: '00000000-0000-4000-8000-000000000002', // veterinario (usuario)
  employee: '00000000-0000-4000-8000-000000000003', // su empleado en la clínica
  vet: '00000000-0000-4000-8000-000000000100', // Clínica Patitas (dev)
  otherVet: '00000000-0000-4000-8000-000000000200', // otra clínica sin acceso
  petMax: '00000000-0000-4000-8000-000000000301', // Max: dueño = owner, compartido con vet
  petUnclaimed: '00000000-0000-4000-8000-000000000302', // Luna: registrada por la clínica, sin dueño con cuenta
  petNotShared: '00000000-0000-4000-8000-000000000303', // Rex: dueño = owner pero no compartido con vet
};

const CLINIC_PERMISSIONS = ['CLINICAL_READ', 'CLINICAL_READ_BASIC', 'CLINICAL_WRITE', 'NURSING_WRITE', 'DOCUMENT_UPLOAD'];

const PETS = {
  [IDS.petMax]: { id: IDS.petMax, ownerId: IDS.owner, name: 'Max', claimStatus: 'CLAIMED', ownerContact: null },
  [IDS.petNotShared]: { id: IDS.petNotShared, ownerId: IDS.owner, name: 'Rex', claimStatus: 'CLAIMED', ownerContact: null },
  [IDS.petUnclaimed]: {
    id: IDS.petUnclaimed,
    ownerId: null,
    name: 'Luna',
    claimStatus: 'UNCLAIMED',
    ownerContact: { name: 'Carlos Pérez', email: 'carlos@correo.com', phone: '+573001234567' },
  },
};

const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const publicJwk = { ...(await exportJWK(publicKey)), kid: 'dev-key-1', use: 'sig', alg: 'RS256' };

function accessFor(vetId, petId, userId) {
  const isClinicEmployee = vetId === IDS.vet && userId === IDS.vetUser;
  const sharedWithVet = petId === IDS.petMax || petId === IDS.petUnclaimed;
  if (!isClinicEmployee || !sharedWithVet) {
    return { hasAccess: false, veterinaryStatus: 'ACTIVE', employeeId: null, role: null, licensed: false, permissions: [] };
  }
  return {
    hasAccess: true,
    veterinaryStatus: 'ACTIVE',
    employeeId: IDS.employee,
    role: 'VETERINARIAN',
    licensed: true,
    permissions: CLINIC_PERMISSIONS,
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function requireInternalKey(req, res) {
  if (req.headers['x-internal-api-key'] !== INTERNAL_API_KEY) {
    send(res, 401, { error: 'X-Internal-Api-Key inválida' });
    return false;
  }
  return true;
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/.well-known/jwks.json') {
    return send(res, 200, { keys: [publicJwk] });
  }

  if (path.startsWith('/internal/') && !requireInternalKey(req, res)) return;

  let match = path.match(/^\/internal\/pets\/([^/]+)\/owner\/([^/]+)$/);
  if (req.method === 'GET' && match) {
    const [, petId, userId] = match;
    return send(res, 200, { isOwner: PETS[petId]?.ownerId === userId });
  }

  if (req.method === 'POST' && path === '/internal/pets/batch') {
    const { ids = [] } = await readJson(req);
    return send(res, 200, ids.map((id) => PETS[id]).filter(Boolean));
  }

  match = path.match(/^\/internal\/veterinaries\/([^/]+)\/patients\/([^/]+)\/access$/);
  if (req.method === 'GET' && match) {
    const [, vetId, petId] = match;
    return send(res, 200, accessFor(vetId, petId, url.searchParams.get('userId')));
  }

  match = path.match(/^\/internal\/veterinaries\/([^/]+)\/summary$/);
  if (req.method === 'GET' && match) {
    return send(res, 200, { id: match[1], name: 'Clínica Patitas (dev)' });
  }

  send(res, 404, { error: 'Ruta no simulada' });
});

async function signToken(claims) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: publicJwk.kid })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('12h')
    .setJti(crypto.randomUUID())
    .sign(privateKey);
}

server.listen(PORT, async () => {
  const owner = await signToken({
    sub: IDS.owner,
    email: 'dueno@correo.com',
    email_verified: true,
    platform_role: 'USER',
    ctx: 'USER',
  });
  const clinic = await signToken({
    sub: IDS.vetUser,
    email: 'vet@correo.com',
    email_verified: true,
    platform_role: 'USER',
    ctx: 'VETERINARY',
    vet_id: IDS.vet,
    employee_id: IDS.employee,
    vet_role: 'VETERINARIAN',
    vet_licensed: true,
    vet_status: 'ACTIVE',
  });
  const otherOwner = await signToken({
    sub: IDS.otherOwner,
    email: 'otro@correo.com',
    email_verified: true,
    platform_role: 'USER',
    ctx: 'USER',
  });

  console.log(`\nStub de servicios escuchando en http://localhost:${PORT}\n`);
  console.log('Agrega a .env.local (solo para desarrollo):');
  console.log(`  JWT_JWKS_URI=http://localhost:${PORT}/.well-known/jwks.json`);
  console.log(`  PETS_SERVICE_URL=http://localhost:${PORT}`);
  console.log(`  VETERINARY_SERVICE_URL=http://localhost:${PORT}`);
  console.log(`  INTERNAL_API_KEY=${INTERNAL_API_KEY}\n`);
  console.log('IDs de prueba:');
  console.log(`  dueño de Max (Max compartido con la clínica):  ${IDS.owner}`);
  console.log(`  mascota de Max:                                ${IDS.petMax}`);
  console.log(`  mascota de Rex (dueño, NO compartida):         ${IDS.petNotShared}`);
  console.log(`  mascota sin dueño (Luna):                      ${IDS.petUnclaimed}`);
  console.log(`  clínica:                                       ${IDS.vet}\n`);
  console.log(`TOKEN_DUEÑO=${owner}\n`);
  console.log(`TOKEN_CLINICA=${clinic}\n`);
  console.log(`TOKEN_OTRO_DUEÑO=${otherOwner}\n`);
});
