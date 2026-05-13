/**
 * 백엔드 `LoginRequest` 와 필드명을 맞춥니다.
 */
export type LoginRequest = {
  username: string
  password: string
}

/**
 * 백엔드 `UserSignUpRequest` 와 필드명을 맞춥니다.
 */
export type UserSignUpRequest = {
  userId: string   // Officer ID
  username: string // 실명
  password: string
  role: string
  department: string
}
