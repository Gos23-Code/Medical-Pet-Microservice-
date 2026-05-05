export interface CreateWeightRecordDto {
  petId: string;  
  weight: number;
  date?: string;
  note?: string;
}

export interface weightRecordResponseDto{
    message: string;
    id: string;
    petId: string;
    weight: number;
    date?: string;
    note?: string;
}