/**
 * 백엔드 `LoginRequest` 와 필드명을 맞춥니다.
 */
export type LoginRequest = {
  username: string
  password: string
}

/**
 * 백엔드 `UserSignUpRequest` 와 필드명을 맞춥니다.
 * Java DTO 필드명이 다르면 여기만 수정하세요.
 */
export type UserSignUpRequest = {
  username: string
  password: string
  name: string
  /** 소속 기관 */
  organization: string
  rank: string
  /** 발급 인증번호 */
  authCode: string
}
