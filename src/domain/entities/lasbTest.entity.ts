import { error } from "console"; //Para ver los errores en la terminal (santa medicina)

export interface LabTestProps {
  id?: string;
  visit_id?: string;
  name: string;
  result?: string;
  normal_range?: string;
  date?: Date;
  notes?: string;
  created_at: Date;
}

export class LabTest {
  private constructor(private props: LabTestProps) {}

  static create(
    props: Omit<LabTestProps, 'created_at'>
  ): LabTest {
    return new LabTest({
      ...props,
      created_at: new Date(),
    });
  }

  static reconstitute(props: LabTestProps): LabTest {
    return new LabTest(props);
  }

  // Getters
  get id() { return this.props.id; }
  get visit_id() { return this.props.visit_id; }
  get name() { return this.props.name; }
  get result() { return this.props.result; }
  get normal_range() { return this.props.normal_range; }
  get date() { return this.props.date; }
  get notes() { return this.props.notes; }
  get created_at() { return this.props.created_at; }
}