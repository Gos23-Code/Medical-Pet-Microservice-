export class weightRecord {
  constructor(
    public id: string,
    public petId: string,
    public weight?: number,
    public date?: Date,
    public note?: string,
    public createdAt?: Date
  ) {}

  static create(props: {
    weight: number;
    date?: Date;
    note?: string;
  }): weightRecord {
    return new weightRecord(
      '',
      '',
      props.weight,
      props.date,
      props.note
    );
  }


  static reconstitute(data: {
    id: string;
    petId: string;
    weight?: number;
    date?: Date;
    note?: string;
    createdAt: Date;
  }): weightRecord {
    return new weightRecord(
      data.id,
      data.petId,
      data.weight,
      data.date,
      data.note,
      data.createdAt
    );
  }
}