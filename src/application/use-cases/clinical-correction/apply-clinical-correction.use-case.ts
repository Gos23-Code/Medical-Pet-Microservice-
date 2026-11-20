import {
  ClinicalCorrectionRepository,
  CorrectableTable,
  CORRECTABLE_TABLES,
} from '@/src/domain/repositories/clinical-correction.repository';
import { assertCanCorrect, requireReason, CorrectionActor } from '@/src/application/clinical/act-integrity';
import { ApiError, NotFoundError } from '@/src/infrastructure/http/api-error';

export interface ApplyCorrectionCommand {
  table: CorrectableTable;
  recordId: string;
  actor: CorrectionActor;
  reason: unknown;
  values: Record<string, unknown>;
  /** Del token: el empleado de la clínica, si el actor es clínica. */
  employeeId: string | null;
}

export class ApplyClinicalCorrectionUseCase {
  constructor(private readonly repository: ClinicalCorrectionRepository) {}

  async execute(command: ApplyCorrectionCommand): Promise<{ version: number }> {
    if (!CORRECTABLE_TABLES.includes(command.table)) {
      throw new ApiError(400, 'TABLE_NOT_CORRECTABLE', `La tabla ${command.table} no admite correcciones`);
    }

    const reason = requireReason(command.reason);

    const act = await this.repository.getActRef(command.table, command.recordId);
    if (!act) {
      throw new NotFoundError('ACT_NOT_FOUND', 'El acto clínico no existe');
    }

    assertCanCorrect(command.actor, act);

    const version = await this.repository.applyCorrection({
      table: command.table,
      recordId: command.recordId,
      reason,
      values: command.values,
      authorUserId: command.actor.userId,
      authorEmployeeId: command.actor.veterinaryId ? command.employeeId : null,
      veterinaryId: command.actor.veterinaryId,
      authorRole: command.actor.veterinaryId ? 'CLINIC' : 'OWNER',
    });

    return { version };
  }
}
