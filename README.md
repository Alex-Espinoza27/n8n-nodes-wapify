# n8n-nodes-wapify

Nodo **community de n8n** para [Wapify](https://ws.zigo.solutions) — envío de WhatsApp por API.
Es un **módulo de integración independiente** del backend: solo traduce operaciones del flujo
n8n a la API pública de Wapify (`/wapify/v1`) usando la credencial `x-api-key`. No contiene
lógica de negocio (límites, anti-baneo y planes se aplican en el backend).

> El mismo patrón sirve para **Make**: ahí se usa un módulo HTTP/conector apuntando a
> `/wapify/v1` con el header `x-api-key`. Este paquete es el conector nativo de n8n.

## Instalación

**Opción A — n8n Cloud / Self-hosted (Settings → Community Nodes):**
buscar/instalar `n8n-nodes-wapify`.

**Opción B — local (desarrollo):**
```bash
cd integrations/n8n-nodes-wapify
npm install
npm run build            # compila a dist/
# enlazar en tu instancia n8n self-hosted:
npm link
cd ~/.n8n/nodes && npm link n8n-nodes-wapify
# reiniciar n8n
```

## Credencial — "Wapify API"
| Campo | Valor |
|---|---|
| Base URL | `https://ws.zigo.solutions/wapify/v1` (por defecto) |
| API Key | `x-api-key` de la empresa (panel Wapify → Claves de API) |

La prueba de credencial llama a `GET /uso`. La doc interactiva está en `/wapify/v1/docs`.

## Operaciones

| Recurso | Operación | Endpoint Wapify |
|---|---|---|
| **Mensaje** | Enviar | `POST /instance/{id}/send` |
| **Mensaje** | Enviar Lote | `POST /instance/{id}/send-batch` |
| **Instancia** | Listar | `GET /instances` |
| **Instancia** | Estado | `GET /instance/{id}/status` |
| **Instancia** | Salud | `GET /instance/{id}/salud` |
| **Cuenta** | Uso | `GET /uso` |
| **Cuenta** | Historial | `GET /messages?limite=N` |

Las respuestas de la API (incluido el manejo de límites/plan, p. ej. `403 FEATURE_NOT_AVAILABLE`,
`422 NUMBER_NOT_ON_WHATSAPP`, `429`) pasan tal cual al flujo para que el usuario las maneje.

## Ejemplo de flujo
`Trigger` → **Wapify: Mensaje → Enviar** (instanceId, número, texto) → seguir el flujo con la
respuesta (`mensajeId`, `estado`). Para campañas: **Enviar Lote** con varios números.

## Arquitectura (separación de responsabilidades)
- **Este paquete** = capa de integración (n8n ↔ HTTP). Sin estado ni reglas de negocio.
- **Wapify backend** (`/wapify/v1`) = envío, colas, anti-baneo, planes, webhooks.
- Mantener separado evita mezclar "flujos de integración" con el envío directo.

## Build / publicación
```bash
npm run lint     # tsc --noEmit
npm run build    # genera dist/
npm publish      # (cuando esté listo para el registro de n8n community)
```
