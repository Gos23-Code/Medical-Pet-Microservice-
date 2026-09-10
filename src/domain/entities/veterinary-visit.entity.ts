import { Weight } from '../value-objects/weight.vo';
import { Temperature } from '../value-objects/temperature.vo';

export type VisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export interface VeterinaryVisitProps {
  id: string;
  petId: string;
  date: Date;
  reason: string;
  diagnosis?: string;
  veterinarian: string;
  notes?: string;
  weight?: Weight;
  temperature?: Temperature;
  createdAt: Date;
  updatedAt: Date;
  status: VisitStatus;           // ✅ NUEVO
  reminderCount: number;          // ✅ NUEVO
  lastReminderSentAt: Date | null; // ✅ NUEVO
}

export class VeterinaryVisit {
  private constructor(private props: VeterinaryVisitProps) {}

  static create(props: Omit<VeterinaryVisitProps, 'createdAt' | 'updatedAt' | 'status' | 'reminderCount' | 'lastReminderSentAt'>): VeterinaryVisit {
    // ✅ Calcular estado inicial basado en la fecha
    const now = new Date();
    const visitDate = new Date(props.date);
    visitDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const status: VisitStatus = visitDate < now ? 'OVERDUE' : 'SCHEDULED';

    return new VeterinaryVisit({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: status,
      reminderCount: 0,
      lastReminderSentAt: null,
    });
  }

  static reconstitute(props: VeterinaryVisitProps): VeterinaryVisit {
    return new VeterinaryVisit(props);
  }

  // Getters
  get id(): string { return this.props.id; }
  get petId(): string { return this.props.petId; }
  get date(): Date { return this.props.date; }
  get reason(): string { return this.props.reason; }
  get diagnosis(): string | undefined { return this.props.diagnosis; }
  get veterinarian(): string { return this.props.veterinarian; }
  get notes(): string | undefined { return this.props.notes; }
  get weight(): Weight | undefined { return this.props.weight; }
  get temperature(): Temperature | undefined { return this.props.temperature; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get status(): VisitStatus { return this.props.status; }
  get reminderCount(): number { return this.props.reminderCount; }
  get lastReminderSentAt(): Date | null { return this.props.lastReminderSentAt; }

  // ✅ Métodos de negocio

  updateDiagnosis(diagnosis: string): void {
    if (!diagnosis || diagnosis.trim().length === 0) {
      throw new Error('El diagnóstico no puede estar vacío');
    }
    this.props.diagnosis = diagnosis;
    this.props.updatedAt = new Date();
  }

  updateNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  // ✅ Marcar como confirmada
  confirm(): void {
    if (this.props.status === 'COMPLETED' || this.props.status === 'CANCELLED') {
      throw new Error(`No se puede confirmar una visita con estado ${this.props.status}`);
    }
    this.props.status = 'CONFIRMED';
    this.props.updatedAt = new Date();
  }

  // ✅ Marcar como completada
  complete(diagnosis?: string, notes?: string): void {
    if (this.props.status === 'CANCELLED') {
      throw new Error('No se puede completar una visita cancelada');
    }
    if (diagnosis) {
      this.props.diagnosis = diagnosis;
    }
    if (notes) {
      this.props.notes = notes;
    }
    this.props.status = 'COMPLETED';
    this.props.updatedAt = new Date();
  }

  // ✅ Marcar como cancelada
  cancel(): void {
    if (this.props.status === 'COMPLETED') {
      throw new Error('No se puede cancelar una visita ya completada');
    }
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();
  }

  // ✅ Marcar como retrasada (OVERDUE)
  markAsOverdue(): void {
    if (this.props.status === 'SCHEDULED') {
      this.props.status = 'OVERDUE';
      this.props.updatedAt = new Date();
    }
  }

  // ✅ Incrementar contador de recordatorios
  incrementReminderCount(): void {
    this.props.reminderCount += 1;
    this.props.lastReminderSentAt = new Date();
    this.props.updatedAt = new Date();
  }

  // ✅ Actualizar fecha del último recordatorio
  updateLastReminderSent(): void {
    this.props.lastReminderSentAt = new Date();
    this.props.updatedAt = new Date();
  }

  // ✅ Verificar si se puede enviar recordatorio
  canSendReminder(): boolean {
    return (
      this.props.reminderCount < 3 &&
      this.props.status !== 'CONFIRMED' &&
      this.props.status !== 'COMPLETED' &&
      this.props.status !== 'CANCELLED'
    );
  }

  // ✅ Verificar si está vencida (OVERDUE)
  isOverdue(): boolean {
    const now = new Date();
    const visitDate = new Date(this.props.date);
    visitDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return (
      this.props.status === 'SCHEDULED' &&
      visitDate < now
    );
  }

  // ✅ Verificar si el día de la visita es hoy
  isToday(): boolean {
    const now = new Date();
    const visitDate = new Date(this.props.date);
    return (
      visitDate.getFullYear() === now.getFullYear() &&
      visitDate.getMonth() === now.getMonth() &&
      visitDate.getDate() === now.getDate()
    );
  }

  // ✅ Calcular días hasta la visita
  daysUntil(): number {
    const now = new Date();
    const visitDate = new Date(this.props.date);
    visitDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  // ✅ Calcular días de retraso
  daysOverdue(): number {
    if (!this.isOverdue()) return 0;
    const now = new Date();
    const visitDate = new Date(this.props.date);
    visitDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      id: this.id,
      petId: this.petId,
      date: this.date.toISOString().split('T')[0],
      reason: this.reason,
      diagnosis: this.diagnosis,
      veterinarian: this.veterinarian,
      notes: this.notes,
      weight: this.weight?.value,
      temperature: this.temperature?.value,
      status: this.status,
      reminderCount: this.reminderCount,
      lastReminderSentAt: this.lastReminderSentAt?.toISOString() || null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}