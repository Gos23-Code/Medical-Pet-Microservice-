export interface weightRecordProps {
  id?: string;
  petId?: string;
  userId?: string;
  weight?: number;
  unit?: 'kg' | 'lb';
  date?: Date;
  note?: string;
  createdAt: Date;
}

export class weightRecord {
  private constructor(private props: weightRecordProps) {}

  static create(
    props: Omit<weightRecordProps, 'createdAt'>
  ): weightRecord {
    return new weightRecord({
      ...props,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: weightRecordProps): weightRecord {
    return new weightRecord(props);
  }

  get id() { return this.props.id; }
  get petId() { return this.props.petId; }
  get userId() { return this.props.userId; }
  get weight() { return this.props.weight; }
  get unit() { return this.props.unit; }
  get date() { return this.props.date; }
  get note() { return this.props.note; }
  get createdAt() { return this.props.createdAt; }

  updateWeight(weight: number): void{
    if (weight<=0){
      throw new Error('El peso debe ser mayor de 0');
    }
    this.props.weight = weight;
  }
}