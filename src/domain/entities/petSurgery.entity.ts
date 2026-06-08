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

  public update(props: Partial<Omit<PetSurgeryProps, 'id' | 'createdAt' | 'petId' | 'veterinaryVisitId'>>): void {
    Object.assign(this.props, props);
    this.props.updatedAt = new Date();
  }

  public toJSON(): PetSurgeryProps {
    return { ...this.props };
  }
}