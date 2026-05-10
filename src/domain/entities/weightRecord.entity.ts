import { error } from "console";//Para ver los errores en la terminal (santa medicina)

export interface weightRecordProps {
  id?: string;
  petId?: string;
  weight?: number;
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
  get weight() { return this.props.weight; }
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