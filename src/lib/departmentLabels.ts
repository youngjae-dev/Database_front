/** 백엔드 department 코드 → 화면 표시 (헤더·마이페이지 등 공통) */
export const DEPARTMENT_LABELS: Record<string, string> = {
  INVESTIGATOR: '수사관',
  CUSTODIAN: '증거물 보관 담당자',
  ANALYST: '분석관',
  ADMIN: '시스템 관리자',
  LEGAL: '법무 담당자',
}

export function formatDepartmentLabel(code: string): string {
  const c = code.trim()
  if (!c) return '—'
  return DEPARTMENT_LABELS[c] ?? c
}
