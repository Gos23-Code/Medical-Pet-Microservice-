export interface CreateWeightRecordDto {  
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
  createdAt: string;
}

export interface weightRecordListResponseDto{
  id: string;
  petId: string;
  weight: number;
  date?: string;
  note?: string;
  createdAt: string;
}

export interface UpdateWeightRecordDto{
  weight: number;
}