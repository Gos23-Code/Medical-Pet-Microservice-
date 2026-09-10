export const PUBSUB_TOPICS = {
  LAB_TEST: 'medical-pet-lab-test',
  MEDICATIONS: 'medical-pet-medications',
  SURGERY: 'medical-pet-surgery',
  TREATMENTS: 'medical-pet-treatments',
  VACCINE: 'medical-pet-vaccine',
  VISITS: 'medical-pet-visits',
  WEIGHT_RECORD: 'medical-pet-weight-record',
} as const;

// ✅ Usando el naming de notificaciones
export const PUBSUB_SUBSCRIPTIONS = {
  LAB_TEST: 'sub-notificaciones-lab-test',
  MEDICATIONS: 'sub-notificaciones-medications',
  SURGERY: 'sub-notificaciones-surgery',
  TREATMENTS: 'sub-notificaciones-treatments',
  VACCINE: 'sub-notificaciones-vaccine',
  VISITS: 'sub-notificaciones-visits',
  WEIGHT_RECORD: 'sub-notificaciones-weight',
} as const;

export type PubSubTopic = typeof PUBSUB_TOPICS[keyof typeof PUBSUB_TOPICS];
export type PubSubSubscription = typeof PUBSUB_SUBSCRIPTIONS[keyof typeof PUBSUB_SUBSCRIPTIONS];

export const TOPIC_TO_EVENTS: Record<PubSubTopic, string[]> = {
  [PUBSUB_TOPICS.LAB_TEST]: [
    'LAB_TEST_CREATED',
    'LAB_TEST_RESULT_UPDATED',
    'LAB_TEST_IS_NORMAL_CHECKED',
  ],
  [PUBSUB_TOPICS.MEDICATIONS]: [
    'MEDICATION_PRESCRIBED',
    'MEDICATION_ADMINISTERED',
  ],
  [PUBSUB_TOPICS.SURGERY]: [
    'SURGERY_SCHEDULED',
    'SURGERY_COMPLETED',
  ],
  [PUBSUB_TOPICS.TREATMENTS]: [
    'TREATMENT_STARTED',
    'TREATMENT_UPDATED',
    'TREATMENT_COMPLETED',
  ],
  [PUBSUB_TOPICS.VACCINE]: [
    'VACCINE_APPLIED',
    'VACCINE_DUE_REMINDER',
  ],
  [PUBSUB_TOPICS.VISITS]: [
    'VISIT_SCHEDULED',
    'VISIT_COMPLETED',
  ],
  [PUBSUB_TOPICS.WEIGHT_RECORD]: [
    'WEIGHT_RECORDED',
    'WEIGHT_ALERT',
  ],
};