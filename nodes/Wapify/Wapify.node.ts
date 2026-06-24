import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  IDataObject,
} from 'n8n-workflow'
import { NodeOperationError } from 'n8n-workflow'

// Nodo Wapify para n8n. Capa de INTEGRACIÓN: traduce operaciones del flujo a la API
// pública de Wapify (/wapify/v1) con la credencial x-api-key. No contiene lógica de
// negocio (esa vive en el backend); solo orquesta llamadas HTTP.
export class Wapify implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Wapify',
    name: 'wapify',
    icon: 'file:wapify.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Enviar mensajes de WhatsApp y consultar instancias vía Wapify',
    defaults: { name: 'Wapify' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'wapifyApi', required: true }],
    properties: [
      {
        displayName: 'Recurso',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Mensaje', value: 'mensaje' },
          { name: 'Instancia', value: 'instancia' },
          { name: 'Cuenta', value: 'cuenta' },
        ],
        default: 'mensaje',
      },
      // ── Operaciones por recurso ───────────────────────────────────────────────
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['mensaje'] } },
        options: [
          { name: 'Enviar', value: 'enviar', action: 'Enviar un mensaje de texto' },
          { name: 'Enviar Lote', value: 'enviarLote', action: 'Enviar a varios números' },
        ],
        default: 'enviar',
      },
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['instancia'] } },
        options: [
          { name: 'Listar', value: 'listar', action: 'Listar instancias' },
          { name: 'Estado', value: 'estado', action: 'Estado de una instancia' },
          { name: 'Salud', value: 'salud', action: 'Salud (0-100) de una instancia' },
        ],
        default: 'listar',
      },
      {
        displayName: 'Operación',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['cuenta'] } },
        options: [
          { name: 'Uso', value: 'uso', action: 'Uso y plan de la empresa' },
          { name: 'Historial', value: 'historial', action: 'Historial de mensajes' },
        ],
        default: 'uso',
      },
      // ── Campos ────────────────────────────────────────────────────────────────
      {
        displayName: 'Instance ID',
        name: 'instanceId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['mensaje'] } },
      },
      {
        displayName: 'Instance ID',
        name: 'instanceId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['instancia'], operation: ['estado', 'salud'] } },
      },
      {
        displayName: 'Número',
        name: 'number',
        type: 'string',
        default: '',
        required: true,
        placeholder: '51999111222',
        description: 'Número con código de país, sin +',
        displayOptions: { show: { resource: ['mensaje'], operation: ['enviar'] } },
      },
      {
        displayName: 'Números',
        name: 'numbers',
        type: 'string',
        default: '',
        required: true,
        description: 'Lista separada por comas (con código de país)',
        placeholder: '51999111222, 51988222333',
        displayOptions: { show: { resource: ['mensaje'], operation: ['enviarLote'] } },
      },
      {
        displayName: 'Texto',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['mensaje'] } },
      },
      {
        displayName: 'Límite',
        name: 'limite',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['cuenta'], operation: ['historial'] } },
      },
    ],
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const out: INodeExecutionData[] = []
    const creds = await this.getCredentials('wapifyApi')
    const baseUrl = String(creds.baseUrl ?? '').replace(/\/$/, '')

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i) as string
      const operation = this.getNodeParameter('operation', i) as string

      let method: IHttpRequestMethods = 'GET'
      let endpoint = ''
      let body: IDataObject | undefined

      if (resource === 'mensaje' && operation === 'enviar') {
        method = 'POST'
        endpoint = `/instance/${this.getNodeParameter('instanceId', i)}/send`
        body = { type: 'text', number: String(this.getNodeParameter('number', i)), text: String(this.getNodeParameter('text', i)) }
      } else if (resource === 'mensaje' && operation === 'enviarLote') {
        method = 'POST'
        endpoint = `/instance/${this.getNodeParameter('instanceId', i)}/send-batch`
        const numbers = String(this.getNodeParameter('numbers', i)).split(',').map((n) => n.trim()).filter(Boolean)
        body = { type: 'text', numbers, text: String(this.getNodeParameter('text', i)) }
      } else if (resource === 'instancia' && operation === 'listar') {
        endpoint = '/instances'
      } else if (resource === 'instancia' && operation === 'estado') {
        endpoint = `/instance/${this.getNodeParameter('instanceId', i)}/status`
      } else if (resource === 'instancia' && operation === 'salud') {
        endpoint = `/instance/${this.getNodeParameter('instanceId', i)}/salud`
      } else if (resource === 'cuenta' && operation === 'uso') {
        endpoint = '/uso'
      } else if (resource === 'cuenta' && operation === 'historial') {
        endpoint = `/messages?limite=${this.getNodeParameter('limite', i)}`
      } else {
        throw new NodeOperationError(this.getNode(), `Operación no soportada: ${resource}/${operation}`)
      }

      const response = await this.helpers.httpRequestWithAuthentication.call(this, 'wapifyApi', {
        method,
        url: `${baseUrl}${endpoint}`,
        body,
        json: true,
      })
      out.push({ json: response as IDataObject, pairedItem: { item: i } })
    }

    return [out]
  }
}
