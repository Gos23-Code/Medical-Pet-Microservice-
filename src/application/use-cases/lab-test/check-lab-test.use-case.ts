import { LabTestRepository } from '@/src/domain/repositories/lab-test.repository';
import { LabTestIsNormalResponseDto } from '@/src/application/dtos/lab-test.dto';

export class CheckLabTestIsNormalUseCase {
  constructor(private repository: LabTestRepository) {}

  //Funcion Parse para comparar el rango con el resultado
  private parseIsNormal(result: string, normal_range: string): boolean {
    const resultValue = parseFloat(result);

    // Si el resultado no es número
    if(isNaN(resultValue)) return false;
    const range = normal_range.trim();

    //Rango final, menor a x numero
    if(range.startsWith('<')) {
      const max = parseFloat(range.substring(1));
      return resultValue < max;
    }

    //Rango inical, mayor a x numero
    if (range.startsWith('>')) {
      const min = parseFloat(range.substring(1));
      return resultValue > min;
    }

    //Toma el rango
    if (range.includes('-')) {
      const [min, max] = range.split('-').map(parseFloat);
      return resultValue >= min && resultValue <= max;
    }
    return false;
  }

  async execute(visit_id: string): Promise<LabTestIsNormalResponseDto[]> {
    if (!visit_id) {
      throw new Error('visit_id es requerido');
    }
    const labTests = await this.repository.findByVisistId(visit_id);
    return labTests.map((item) => {
      const isNormal = this.parseIsNormal(
        item.result ?? '',
        item.normal_range ?? ''
      );

      return {
        name: item.name,
        result: item.result ?? '',
        normal_range: item.normal_range ?? '',
        is_normal: isNormal,
      };
    });
  }
}