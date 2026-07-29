// lib/eureka/service-registry.ts
import { parseStringPromise } from 'xml2js';

// Definir interfaces
interface EurekaInstance {
  hostName: string[];
  port: Array<{ $: { port: number } }>;
  status: string[];
}

interface EurekaResponse {
  application: {
    instance: EurekaInstance | EurekaInstance[];
  };
}

interface ServiceInstance {
  hostName: string;
  port: number;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
}

class EurekaServiceRegistry {
  private cache: Map<string, { instances: ServiceInstance[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000;
  private eurekaUrl: string;

  constructor() {
    this.eurekaUrl = process.env.EUREKA_URL || 'http://localhost:8761/eureka';
  }

  async getServiceInstances(serviceName: string): Promise<ServiceInstance[]> {
    const cacheKey = serviceName.toUpperCase();
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.instances;
    }

    try {
      const response = await fetch(`${this.eurekaUrl}/apps/${serviceName}`);
      if (!response.ok) throw new Error(`Eureka error: ${response.status}`);
      
      const xmlData = await response.text();
      const parsed = await this.parseEurekaResponse(xmlData);
      
      const upInstances = parsed.filter((inst) => 
        inst.status?.toUpperCase() === 'UP'
      );

      this.cache.set(cacheKey, {
        instances: upInstances,
        timestamp: Date.now()
      });

      return upInstances;
    } catch (error) {
      console.error(`Error fetching ${serviceName} from Eureka:`, error);
      return this.getFallbackInstances(serviceName);
    }
  }

  async getServiceUrl(serviceName: string): Promise<string> {
    const instances = await this.getServiceInstances(serviceName);
    
    if (instances.length === 0) {
      throw new Error(`No available instances for ${serviceName}`);
    }

    const instance = instances[Math.floor(Math.random() * instances.length)];
    return `http://${instance.hostName}:${instance.port}`;
  }

  private async parseEurekaResponse(xml: string): Promise<ServiceInstance[]> {
    try {
      const result = await parseStringPromise(xml) as EurekaResponse;
      const app = result.application;
      
      if (!app || !app.instance) {
        return [];
      }

      const instances = Array.isArray(app.instance) ? app.instance : [app.instance];
      
      return instances.map((inst: EurekaInstance) => ({
        hostName: inst.hostName?.[0] || 'localhost',
        port: parseInt(inst.port?.[0]?.$?.port?.toString() || '8080'),
        status: (inst.status?.[0]?.toUpperCase() as 'UP' | 'DOWN' | 'UNKNOWN') || 'UNKNOWN'
      }));
    } catch (error) {
      console.error('Error parsing Eureka XML:', error);
      return [];
    }
  }

  private getFallbackInstances(serviceName: string): ServiceInstance[] {
    const defaultPorts: Record<string, number> = {
      'LAB-SERVICE': 8081,
      'MEDICATIONS-SERVICE': 8082,
      'SURGERY-SERVICE': 8083,
      'PET-SERVICE': 8084,
      'VISIT-SERVICE': 8085,
      'TREATMENTS-SERVICE': 8086,
      'WEIGHT-SERVICE': 8087
    };

    const port = defaultPorts[serviceName.toUpperCase()] || 8080;
    return [{ hostName: 'localhost', port, status: 'UP' }];
  }
}

// ✅ Crear la instancia primero
const eurekaServiceRegistry = new EurekaServiceRegistry();

// ✅ Exportar como default
export default eurekaServiceRegistry;