// src/domain/entities/petSurgery.entity.ts
export type PetSurgeryStatus = 
  | 'SCHEDULED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'COMPLICATED' 
  | 'CANCELLED';

export type PetSurgeryOutcome = 
  | 'SUCCESSFUL' 
  | 'COMPLICATIONS' 
  | 'DECEASED';

export interface PetSurgeryProps {
  id: string;
  petId: string;
  veterinaryVisitId: string;
  title: string;
  description: string;
  surgeryDate: Date;
  durationMinutes: number;
  anesthesiaUsed?: string | null;
  complications?: string | null;
  postOpInstructions?: string | null;
  outcome?: PetSurgeryOutcome | null;
  status: PetSurgeryStatus;
  nextCheckupDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PetSurgery {
  private constructor(private readonly props: PetSurgeryProps) {}

  static create(props: Omit<PetSurgeryProps, 'id' | 'createdAt' | 'updatedAt'>): PetSurgery {
    return new PetSurgery({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: PetSurgeryProps): PetSurgery {
    return new PetSurgery(props);
  }

  public get id(): string { return this.props.id; }
  public get petId(): string { return this.props.petId; }
  public get veterinaryVisitId(): string { return this.props.veterinaryVisitId; }
  public get title(): string { return this.props.title; }
  public get description(): string { return this.props.description; }
  public get surgeryDate(): Date { return this.props.surgeryDate; }
  public get durationMinutes(): number { return this.props.durationMinutes; }
  public get anesthesiaUsed(): string | undefined | null { return this.props.anesthesiaUsed; }
  public get complications(): string | undefined | null { return this.props.complications; }
  public get postOpInstructions(): string | undefined | null { return this.props.postOpInstructions; }
  public get outcome(): PetSurgeryOutcome | undefined | null { return this.props.outcome; }
  public get status(): PetSurgeryStatus { return this.props.status; }
  public get nextCheckupDate(): Date | undefined | null { return this.props.nextCheckupDate; }
  public get createdAt(): Date { return this.props.createdAt; }
  public get updatedAt(): Date { return this.props.updatedAt; }

  public update(data: Partial<Omit<PetSurgeryProps, 'id' | 'createdAt'>>): void {
    // Actualizar campos
    if (data.title !== undefined) this.props.title = data.title;
    if (data.description !== undefined) this.props.description = data.description;
    if (data.surgeryDate !== undefined) this.props.surgeryDate = data.surgeryDate;
    if (data.durationMinutes !== undefined) this.props.durationMinutes = data.durationMinutes;
    if (data.anesthesiaUsed !== undefined) this.props.anesthesiaUsed = data.anesthesiaUsed;
    if (data.complications !== undefined) this.props.complications = data.complications;
    if (data.postOpInstructions !== undefined) this.props.postOpInstructions = data.postOpInstructions;
    if (data.outcome !== undefined) this.props.outcome = data.outcome;
    if (data.status !== undefined) this.props.status = data.status;
    if (data.nextCheckupDate !== undefined) this.props.nextCheckupDate = data.nextCheckupDate;
    
    // Siempre actualizar la fecha de modificación
    this.props.updatedAt = new Date();
  }

  public toJSON(): PetSurgeryProps {
    return { ...this.props };
  }
}