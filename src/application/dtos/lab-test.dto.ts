export interface CreateLabTestDto {
  name: string;
  result?: string;
  normal_range?: string;
  date?: string;
  notes?: string;
}

export interface LabTestResponseDto {
  message: string;
  id: string;
  visit_id: string;
  name: string;
  result?: string;
  normal_range?: string;
  date?: string;
  notes?: string;
  created_at: string;
}

//Get
export interface labTestListResponseDto{
  id: string;
  visit_id: string;
  name: string;
  result?: string;
  normal_range?: string;
  date?: string;
  notes?: string;
  created_at: string;
}

//UpdateResult
export interface UpdateLabTestResultDto{
  result: string;
}

//Boolean IsNormal
export interface LabTestIsNormalResponseDto {
  name: string;
  result: string;
  normal_range: string;
  is_normal: boolean;
}