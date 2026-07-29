// lib/eureka/httpClient.ts
import serviceRegistry from './service-registry';

// Definir tipos específicos
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Tipo para el body que puede ser cualquier objeto JSON válido
type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface HttpClientOptions {
  serviceName: string;
  path: string;
  method?: HttpMethod;
  body?: JsonBody;
  headers?: Record<string, string>;
}

// Tipo para la respuesta genérica
type ApiResponse<T> = T;

class EurekaHttpClient {
  async request<T = Record<string, unknown>>(options: HttpClientOptions): Promise<ApiResponse<T>> {
    const {
      serviceName,
      path,
      method = 'GET',
      body,
      headers = {}
    } = options;

    try {
      // Obtener URL del servicio desde Eureka
      const baseUrl = await serviceRegistry.getServiceUrl(serviceName);
      const url = `${baseUrl}${path}`;

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      // Solo agregar body si existe
      if (body !== undefined && body !== null) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      // Si la respuesta está vacía
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return {} as ApiResponse<T>;
      }

      return await response.json() as ApiResponse<T>;
    } catch (error) {
      console.error(`Error calling ${serviceName}${path}:`, error);
      throw error;
    }
  }

  // Métodos específicos para cada verbo HTTP
  async get<T = Record<string, unknown>>(
    serviceName: string, 
    path: string, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ serviceName, path, method: 'GET', headers });
  }

  async post<T = Record<string, unknown>>(
    serviceName: string, 
    path: string, 
    body?: JsonBody, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ serviceName, path, method: 'POST', body, headers });
  }

  async put<T = Record<string, unknown>>(
    serviceName: string, 
    path: string, 
    body?: JsonBody, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ serviceName, path, method: 'PUT', body, headers });
  }

  async delete<T = Record<string, unknown>>(
    serviceName: string, 
    path: string, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ serviceName, path, method: 'DELETE', headers });
  }

  async patch<T = Record<string, unknown>>(
    serviceName: string, 
    path: string, 
    body?: JsonBody, 
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ serviceName, path, method: 'PATCH', body, headers });
  }
}

const eurekaHttpClient = new EurekaHttpClient();
export default eurekaHttpClient;