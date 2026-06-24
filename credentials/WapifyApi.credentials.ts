import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow'

// Credencial de Wapify para n8n: API Key de la empresa (x-api-key) + Base URL.
// La API Key se obtiene en el panel de Wapify (módulo de claves de API de la empresa).
export class WapifyApi implements ICredentialType {
  name = 'wapifyApi'
  displayName = 'Wapify API'
  documentationUrl = 'https://ws.zigo.solutions/wapify/v1/docs'
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://ws.zigo.solutions/wapify/v1',
      description: 'Base de la API pública de Wapify (sin barra final).',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'x-api-key de la empresa (panel Wapify → Claves de API).',
    },
  ]

  // Inyecta el header x-api-key en cada petición.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: { 'x-api-key': '={{$credentials.apiKey}}' },
    },
  }

  // Prueba de credencial: GET /uso (devuelve el plan/uso de la empresa).
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/uso',
    },
  }
}
