export interface ApiResponse<T = void> {
  isSuccess: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors: string[];
}
