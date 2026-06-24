# Prueba paso a paso en n8n — Wapify

Guía para validar Wapify dentro de **n8n** usando el nodo `n8n-nodes-wapify`.

## 0. Requisitos
- Una empresa en Wapify con **API Key** (panel → Claves de API).
- Una **instancia conectada** (número de WhatsApp vinculado). Anota su **Instance ID**.
- n8n (Cloud o self-hosted).

## 1. Instalar el nodo
- **n8n Cloud / self-hosted UI:** *Settings → Community Nodes → Install* → escribe `n8n-nodes-wapify` → Install.
- **Self-hosted manual:** `npm i n8n-nodes-wapify` en `~/.n8n/nodes` y reinicia n8n.

Reinicia n8n. Al crear un nodo, busca **"Wapify"**.

## 2. Crear la credencial
1. Al añadir el nodo Wapify, en **Credential to connect with** → *Create New*.
2. Completa:
   - **Base URL:** `https://ws.zigo.solutions/wapify/v1`
   - **API Key:** `<TU_API_KEY>` (la de tu empresa)
3. **Save** → n8n llama `GET /uso` para validar. Debe decir *Connection tested successfully*.

## 3. Workflow de prueba mínimo (enviar 1 mensaje)
1. **Manual Trigger** → conecta a un nodo **Wapify**.
2. Configura el nodo Wapify:
   - **Recurso:** Mensaje
   - **Operación:** Enviar
   - **Instance ID:** `<TU_INSTANCE_ID>`
   - **Número:** `51999111222` (con código de país, sin +)
   - **Texto:** `Hola desde n8n + Wapify 🚀`
3. **Execute workflow**. La salida debe traer `status:true` y `data.mensajeId`.
4. Verifica el WhatsApp del número destino.

## 4. Más pruebas por operación

| Recurso → Operación | Campos | Qué valida |
|---|---|---|
| Mensaje → **Enviar Lote** | Instance ID, Números: `519...,519...`, Texto | Envío masivo (respeta `maxBatch` del plan) |
| Instancia → **Listar** | — | Lista las instancias de la empresa |
| Instancia → **Estado** | Instance ID | Estado de conexión |
| Instancia → **Salud** | Instance ID | Score 0-100 (riesgo de baneo) |
| Cuenta → **Uso** | — | Plan, límites y consumo |
| Cuenta → **Historial** | Límite (ej. 20) | Últimos mensajes |

## 5. Flujo realista de ejemplo
`Schedule Trigger` (cada día 9am) → `Google Sheets` (leer contactos) → `Wapify: Mensaje → Enviar`
(Número e Instance ID con **expresiones** `={{$json.telefono}}`) → `IF` (status true) → registrar resultado.

> Para campañas grandes usa **Enviar Lote** o un nodo **Loop** con un *Wait* entre envíos
> (Wapify ya espacia internamente por anti-baneo; el límite del plan se respeta y devuelve
> `429`/`403` que puedes manejar con un nodo IF).

## 6. Errores que verás (y son normales)
| Código HTTP | Significado | Qué hacer en el flujo |
|---|---|---|
| `403 FEATURE_NOT_AVAILABLE` | El plan no incluye esa función | Avisar / no reintentar |
| `403 PLAN_VENCIDO` / `EMPRESA_INACTIVA` | Plan vencido / empresa inactiva | Detener |
| `422 NUMBER_NOT_ON_WHATSAPP` | El número no tiene WhatsApp | Saltar ese contacto |
| `429` | Límite por minuto/diario | Reintentar con `Wait` |

Toda la referencia interactiva de la API está en `https://ws.zigo.solutions/wapify/v1/docs`.

## 7. Make (Integromat)
El mismo flujo se hace con el módulo **HTTP** de Make apuntando a `https://ws.zigo.solutions/wapify/v1/...`
y el header `x-api-key: <TU_API_KEY>`. Ej.: `POST /instance/<id>/send` con body
`{"type":"text","number":"519...","text":"..."}`.
