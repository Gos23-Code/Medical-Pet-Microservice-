export interface TreatmentProps {
  id: string;
  visitId: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Treatment {
  private constructor(private props: TreatmentProps) {}

  static create(props: Omit<TreatmentProps, 'createdAt' | 'updatedAt'>): Treatment {
    return new Treatment({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: TreatmentProps): Treatment {
    return new Treatment(props);
  }

  get id(): string { return this.props.id; }
  get visitId(): string { return this.props.visitId; }
  get description(): string { return this.props.description; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date | null { return this.props.endDate; }
  get notes(): string | null { return this.props.notes; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  toJSON() {
    return {
      id: this.id,
      visitId: this.visitId,
      description: this.description,
      startDate: this.startDate.toISOString().split('T')[0],
      endDate: this.endDate?.toISOString().split('T')[0] || null,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}