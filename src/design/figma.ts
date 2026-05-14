/**
 * Figma: DB UI/UX
 * https://www.figma.com/design/tJbFOySJXck3laLCqSoB8Y/DB-UI-UX
 * MCP `get_figma_data` / `download_figma_images`에 동일 값 사용.
 *
 * 이미지 다운로드(`download_figma_images`)는 MCP 설정에 따라 사용자 홈 등에 저장될 수 있습니다.
 * Vite에서 쓰려면 `Database_front/public/figma/`로 복사하세요.
 */
export const FIGMA_FILE_KEY = 'tJbFOySJXck3laLCqSoB8Y' as const

/** 주요 COMPONENT 노드 (URL의 node-id를 콜론 형식으로: 0-1 → 0:1) */
export const FIGMA_NODES = {
  page: '0:1',
  home: '12:218',
  login: '12:274',
  signup: '91:461',
  caseList: '12:111',
  caseRegister: '38:134',
  evidenceList: '77:94',
  evidenceRegister: '12:73',
  caseDetail: '87:261',
  myPage: '12:5',
  handover: '114:19',
} as const

export function figmaDesignUrl(node: keyof typeof FIGMA_NODES): string {
  const raw = FIGMA_NODES[node].replace(':', '-')
  return `https://www.figma.com/design/${FIGMA_FILE_KEY}/DB-UI-UX?node-id=${raw}`
}
