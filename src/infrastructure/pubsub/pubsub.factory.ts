import { PubSubService } from './services/pubsub.service';
import { LabTestPublisher } from './publishers/lab-test.publisher';
import { MedicationsPublisher } from './publishers/medication.publisher';
import { SurgeryPublisher } from './publishers/surgery.publisher';
import { TreatmentsPublisher } from './publishers/treatments.publisher';
import { VaccinePublisher } from './publishers/vaccine.publisher';
import { VisitsPublisher } from './publishers/visit.publisher';
import { WeightRecordPublisher } from './publishers/weight-record.publisher';
import { ConfigService } from '@nestjs/config';

// ✅ Singleton para el PubSubService
let pubSubServiceInstance: PubSubService | null = null;

export function getPubSubService(): PubSubService {
    if (!pubSubServiceInstance) {
        const configService = new ConfigService();
        pubSubServiceInstance = new PubSubService(configService);
    }
    return pubSubServiceInstance;
}

// ✅ Fábricas para cada publisher
export function createLabTestPublisher(): LabTestPublisher {
    return new LabTestPublisher(getPubSubService());
}

export function createMedicationsPublisher(): MedicationsPublisher {
    return new MedicationsPublisher(getPubSubService());
}

export function createSurgeryPublisher(): SurgeryPublisher {
    return new SurgeryPublisher(getPubSubService());
}

export function createTreatmentsPublisher(): TreatmentsPublisher {
    return new TreatmentsPublisher(getPubSubService());
}

export function createVaccinePublisher(): VaccinePublisher {
    return new VaccinePublisher(getPubSubService());
}

export function createVisitsPublisher(): VisitsPublisher {
    return new VisitsPublisher(getPubSubService());
}

export function createWeightRecordPublisher(): WeightRecordPublisher {
    return new WeightRecordPublisher(getPubSubService());
}