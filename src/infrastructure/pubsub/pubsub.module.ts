import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubSubService } from './services/pubsub.service';

// Publishers
import { LabTestPublisher } from './publishers/lab-test.publisher';
import { MedicationsPublisher } from './publishers/medication.publisher';
import { SurgeryPublisher } from './publishers/surgery.publisher';
import { TreatmentsPublisher } from './publishers/treatments.publisher';
import { VaccinePublisher } from './publishers/vaccine.publisher';
import { VisitsPublisher } from './publishers/visit.publisher';
import { WeightRecordPublisher } from './publishers/weight-record.publisher';

// Subscribers
import { LabTestSubscriber } from './subscribers/lab-test.subscriber';
import { MedicationsSubscriber } from './subscribers/medication.subscriber';
import { SurgerySubscriber } from './subscribers/surgery.subscriber';
import { TreatmentsSubscriber } from './subscribers/treatments.subscriber';
import { VaccineSubscriber } from './subscribers/vaccine.subscriber';
import { VisitsSubscriber } from './subscribers/visit.subscriber';
import { WeightRecordSubscriber } from './subscribers/weight-record.subscriber';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Service
    PubSubService,

    // Publishers
    LabTestPublisher,
    MedicationsPublisher,
    SurgeryPublisher,
    TreatmentsPublisher,
    VaccinePublisher,
    VisitsPublisher,
    WeightRecordPublisher,

    // Subscribers
    LabTestSubscriber,
    MedicationsSubscriber,
    SurgerySubscriber,
    TreatmentsSubscriber,
    VaccineSubscriber,
    VisitsSubscriber,
    WeightRecordSubscriber,
  ],
  exports: [
    PubSubService,
    LabTestPublisher,
    MedicationsPublisher,
    SurgeryPublisher,
    TreatmentsPublisher,
    VaccinePublisher,
    VisitsPublisher,
    WeightRecordPublisher,
  ],
})
export class PubSubModule {}