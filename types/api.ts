export interface ApiError {
  error: string
  details?: unknown
}

export interface ApiSuccess<T> {
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
