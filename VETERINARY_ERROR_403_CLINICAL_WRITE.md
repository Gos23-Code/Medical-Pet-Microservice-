# Error: 403 `INSUFFICIENT_PERMISSION` (falta `CLINICAL_WRITE`) en Medical

Written for: equipo del microservicio de Veterinary.

## 1. Resumen

Las rutas de clínica de Medical ya llegan a Veterinary y reciben respuesta. El problema actual es de permisos: al crear una visita con un token de clínica, Medical responde **403** con este error:

```json
{
  "timestamp": "2026-11-10T17:15:36.290Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Falta el permiso CLINICAL_WRITE",
  "code": "INSUFFICIENT_PERMISSION"
}
```

Medical hizo bien su trabajo: consultó a Veterinary, recibió que la clínica tiene acceso a la mascota (`hasAccess: true`), y ese acceso no incluye `CLINICAL_WRITE` en `permissions`. Por eso rechaza la petición.

## 2. Qué probamos

| Paso | Resultado |
|---|---|
| `POST /api/visits` (Medical, Cloud Run) con token de clínica | **403** `INSUFFICIENT_PERMISSION`, "Falta el permiso CLINICAL_WRITE" |
| Medical consulta `GET /internal/veterinaries/{vetId}/patients/{petId}/access?userId=` | Veterinary responde (ya no es 404) |
| Veterinary incluye `CLINICAL_WRITE` en `permissions` de esa respuesta | **No**. El empleado no lo tiene |

Ya no es el 404 de antes, así que la ruta de `access` ya está desplegada. El problema es de datos: el empleado no tiene la licencia verificada.

## 3. Qué espera Medical

Según `CONTRATOS_COMPARTIDOS.md` §3 y §3.2, `CLINICAL_WRITE` lo tiene un `VETERINARIAN` solo si `licensed = true`. Esto significa que la licencia profesional está verificada (`license_status = VERIFIED` en `professional_profiles`).

Para las operaciones que Medical hace con un token de clínica, el permiso que exige cada una es:

| Operación en Medical | Permiso exigido en `permissions` |
|---|---|
| Crear visita, cirugía, laboratorio, tratamiento, medicación | `CLINICAL_WRITE` |
| Registrar peso, aplicar vacuna | `NURSING_WRITE` |
| Subir documentos | `DOCUMENT_UPLOAD` |
| Leer historia | `CLINICAL_READ` |

Respuesta esperada de `access` para un veterinario con licencia verificada:

```json
{
  "hasAccess": true,
  "veterinaryStatus": "ACTIVE",
  "employeeId": "uuid",
  "role": "VETERINARIAN",
  "licensed": true,
  "permissions": ["CLINICAL_READ", "CLINICAL_WRITE", "NURSING_WRITE", "DOCUMENT_UPLOAD"]
}
```

## 4. Qué hay que revisar

1. **Estado de la licencia del empleado.** Confirmar si `license_status` es `VERIFIED` para el profesional que hizo la prueba. Según `MD de Vet/ADMIN_REVISION_DE_DOCUMENTOS.md`, la aprobación la hace un administrador desde la pantalla de revisión, y ahí se guarda quién aprobó y cuándo.
2. **Que `licensed` llegue como `true` en la respuesta de `access`.** Si el empleado está aprobado en la base pero `access` devuelve `licensed: false` o no incluye `CLINICAL_WRITE`, el fallo está en cómo Veterinary calcula los permisos.
3. **Que `NURSING_WRITE` se devuelva incondicionalmente para `VETERINARIAN`** (según la matriz del contrato, §3.2), para que el registro de peso y las vacunas funcionen aunque la licencia aún esté pendiente.
4. **Refresco del token de clínica.** Según `ADMIN_REVISION_DE_DOCUMENTOS.md`, el permiso de escritura se obtiene en el siguiente refresh del token (máximo 15 min). Si la aprobación fue reciente, el token de prueba tiene que renovarse.

## 5. Cómo comprobarlo

Con la clave interna (sin mostrarla en el chat):

```bash
curl -H "X-Internal-Api-Key: <clave>" \
  "https://veterinary-microservice-petsapp-bjo5vkqo4q-uc.a.run.app/internal/veterinaries/<vetId>/patients/<petId>/access?userId=<userId>"
```

Revisa que la respuesta incluya `CLINICAL_WRITE` en `permissions` para el empleado aprobado, y que `licensed` sea `true`. Si los datos de la base dicen `VERIFIED` pero la respuesta no lo refleja, el problema está en el cálculo de permisos de Veterinary.

Cuando esa respuesta incluya `CLINICAL_WRITE`, la petición de visita en Medical debería responder 201.
