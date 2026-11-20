# Qué necesita Medical de Pets

Written for: equipo del microservicio de Pets.

Este documento resume lo que el backend de Medical llama en Pets, qué espera recibir y qué falta hoy. Está basado en el código de Medical (`src/infrastructure/clients/pets.client.ts`, `src/infrastructure/clinical/event-target.ts`, `src/infrastructure/auth/clinical-access.ts`).

## 1. Resumen

Medical no lee la base de datos de Pets. Pregunta por HTTP en dos casos:

| Caso | Endpoint que Medical llama | Cuándo |
|---|---|---|
| El dueño quiere leer o escribir la historia de **su** mascota | `GET /internal/pets/{petId}/owner/{userId}` | En casi todas las rutas con token de dueño |
| Hay que decidir a quién notificar un evento de historia | `POST /internal/pets/batch` | Al publicar eventos (vacuna, peso, cirugía, etc.) |

Hoy **ninguno de los dos endpoints funciona**. Medical recibe un 500 y lo devuelve al cliente como 503.

## 2. Autenticación

Medical envía en cada llamada el header:

```
X-Internal-Api-Key: <clave compartida>
```

La clave es la misma que usan los demás servicios internos. Pets debe rechazar con **401** cuando el header falta o no coincide. Medical la toma de su variable `INTERNAL_API_KEY` (en Cloud Run, desde Secret Manager).

## 3. Endpoint 1: ¿es este usuario dueño de esta mascota?

```
GET /internal/pets/{petId}/owner/{userId}
X-Internal-Api-Key: <clave>
```

- `petId`: UUID de la mascota.
- `userId`: el `sub` del JWT del usuario que hace la petición (el ID de la cuenta del User service).

Respuesta esperada (200):

```json
{ "isOwner": true }
```

o

```json
{ "isOwner": false }
```

Reglas:

- Si la mascota no existe, responde **200 con `{ "isOwner": false }`**, no 404. Medical trata cualquier respuesta que no sea 2xx como servicio caído (503), así que un 404 hace que el usuario vea un error de infraestructura en vez de un 403.
- Si el usuario es dueño de la mascota pero la mascota fue registrada por una clínica y aún no está reclamada (`claimStatus = UNCLAIMED`), responde `isOwner: false`. Medical lo tratará como acceso denegado.
- Medical cachea la respuesta 60 segundos, así que tardar un poco no afecta, pero el cambio de dueño puede tardar hasta un minuto en reflejarse.

## 4. Endpoint 2: datos de varias mascotas

```
POST /internal/pets/batch
X-Internal-Api-Key: <clave>
Content-Type: application/json

{ "ids": ["uuid-1", "uuid-2"] }
```

Respuesta esperada (200): un **arreglo** con los datos de cada mascota que exista. Las que no existan se omiten, no devuelven error.

```json
[
  {
    "id": "uuid-1",
    "ownerId": "uuid-del-dueno-con-cuenta",
    "name": "Max",
    "claimStatus": "CLAIMED",
    "ownerContact": null
  },
  {
    "id": "uuid-2",
    "ownerId": null,
    "name": "Luna",
    "claimStatus": "UNCLAIMED",
    "ownerContact": { "name": "Ana Pérez", "email": "ana@correo.com", "phone": "+573001112233" }
  }
]
```

Campos:

| Campo | Tipo | Significado |
|---|---|---|
| `id` | string (UUID) | ID de la mascota |
| `ownerId` | string o null | `sub` del dueño con cuenta. Null si la mascota no tiene dueño con cuenta |
| `name` | string | Nombre de la mascota |
| `claimStatus` | `"NONE"`, `"UNCLAIMED"` o `"CLAIMED"` | Estado de reclamo |
| `ownerContact` | objeto o null | `{ name, email, phone }`. Solo cuando `claimStatus = UNCLAIMED` |
| `birthDate` | string (`YYYY-MM-DD`) o null | **Confirmado por Pets (nov 2026): ya viene en el batch.** Fecha de nacimiento de la mascota. Medical la usa para validar que una esterilización no sea anterior al nacimiento. Si no se conoce, `null` (Medical sigue funcionando, con un valor por defecto) |

> **Nota:** `age` por sí solo no sirve: se necesita la fecha exacta. Si Pets ya tiene `birthDate` en su base de datos, basta con incluirlo en la respuesta del batch.

Medical usa `ownerId` para notificar al dueño con cuenta. Si `ownerId` es null y `ownerContact` tiene email o teléfono, notifica a ese contacto. Si Pets no devuelve la mascota, el evento se omite y la respuesta HTTP de Medical sigue siendo exitosa.

## 4 bis. Endpoint 3: ¿tiene esta persona permiso de editor sobre la mascota?

Pets tiene un solo dueño por mascota. Las demás personas con las que se comparte son **editores**. Medical las deja modificar actos del lado del dueño (no los de una clínica), así que necesita saber si un usuario es editor.

```
GET /internal/pets/{petId}/access/{userId}
X-Internal-Api-Key: <clave>
```

Respuesta esperada (200):

```json
{ "hasAccess": true }
```

Reglas:

- `hasAccess: true` si el usuario tiene permiso de editor compartido sobre esa mascota.
- Si no tiene permiso, o la mascota no existe, responde **200 con `{ "hasAccess": false }`**, igual que el endpoint de dueño.
- Con clave falsa, 401.
- Medical lo cachea 60 segundos.

## 5. Tiempos y disponibilidad

- Medical espera **máximo 3 segundos**. Si Pets tarda más o responde un error, Medical devuelve 503 para el dueño y omite la notificación para eventos.
- Medical cachea las respuestas por 60 segundos.

## 6. Estado actual (qué probamos)

Hechas el 2 y 3 de noviembre de 2026 contra `https://pets-microservice-bjo5vkqo4q-uc.a.run.app`:

| Prueba | Resultado |
|---|---|
| `GET /internal/pets/{petId}/owner/{userId}` con la clave correcta | **500** `{"error":"Error interno del servidor"}` |
| Mismo request con una clave falsa | **500** (debería ser 401) |
| `POST /internal/pets/batch` con la clave correcta | **500** |
| `POST /internal/pets/batch` con una clave falsa | **500** (debería ser 401) |
| `GET /` (raíz) | **500** |

En los logs de Cloud Run (`pets-microservice`), el error de la ruta de dueño es:

```
org.springframework.web.servlet.resource.NoResourceFoundException:
No static resource internal/pets/{petId}/owner/{userId}.
```

Es decir, **la ruta `/internal/pets/...` no está implementada** en el servicio. Spring la trata como un archivo estático que no existe, y el manejador de errores lo devuelve como 500 en lugar de 404.

Probablemente también falte `/internal/pets/batch`, porque las dos pruebas dieron el mismo 500. Conviene confirmarlo en el código.

## 7. Qué hay que hacer

1. Implementar `GET /internal/pets/{petId}/owner/{userId}` con la forma de la sección 3.
2. Implementar `POST /internal/pets/batch` con la forma de la sección 4.
3. Validar el header `X-Internal-Api-Key` en ambos endpoints: 401 si falta o no coincide.
4. Corregir el manejador de errores para que una ruta inexistente responda 404, no 500. Así no se confunde con un fallo real.

## 8. Cómo comprobar que quedó listo

Con la clave correcta (sin mostrarla en el chat):

```bash
curl -H "X-Internal-Api-Key: <clave>" \
  https://pets-microservice-bjo5vkqo4q-uc.a.run.app/internal/pets/<petId>/owner/<userId>
# esperado: 200 {"isOwner": true|false}

curl -X POST -H "X-Internal-Api-Key: <clave>" -H "Content-Type: application/json" \
  -d '{"ids":["<petId>"]}' \
  https://pets-microservice-bjo5vkqo4q-uc.a.run.app/internal/pets/batch
# esperado: 200 [ { "id": "...", ... } ]
```

Con una clave falsa, ambos deben responder 401.

Cuando estas tres cosas den lo esperado, Medical podrá crear visitas, registrar pesos y publicar eventos de dueño sin cambios de su lado.
