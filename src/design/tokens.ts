/** DB UI/UX (Figma file tJbFOySJXck3laLCqSoB8Y) — Tailwind-friendly 상수 */

export const figma = {
  navy: '#081C47',
  navyText: '#071B48',
  orange: '#FF8A00',
  white: '#FFFFFF',
  border: '#D9D9D9',
  text: '#000000',
  textMuted: '#252525',
  textPlaceholder: 'rgba(37,37,37,0.55)',
  tableHeader: 'rgba(167,193,255,0.29)',
  headerShadow: '0px 2px 3px 0px rgba(167, 193, 255, 0.29)',
  cardShadow: '1px 2px 10px 0px rgba(0, 0, 0, 0.25)',
  pageBg: '#F5F7FB',
  loginMuted: '#776060',
  alertOrangeBg: 'rgba(255, 138, 0, 0.25)',
  alertOrangeBorder: '#FF8A00',
} as const

export const figmaCls = {
  panel: 'rounded-[15px] border-2 border-[#D9D9D9] bg-white',
  panelSoft: 'rounded-[15px] border border-[#D9D9D9] bg-white',
  innerTable: 'overflow-hidden rounded-[10px] border-2 border-[#D9D9D9]',
  tableHead: 'bg-[rgba(167,193,255,0.29)] text-black',
  titlePage: 'text-[clamp(2rem,5vw,3.125rem)] font-semibold leading-tight text-black',
  subtitle: 'text-[20px] font-normal text-[#252525]',
  /** 한 줄 유지: clamp 대신 고정 단계 + nowrap (좁은 폭에서 두 줄 방지) */
  btnPrimary:
    'inline-flex items-center justify-center whitespace-nowrap rounded-[15px] bg-[#081C47] px-4 py-3 text-center text-[15px] font-semibold leading-none text-white shadow-sm transition hover:bg-[#0a2560] sm:px-5 sm:text-[16px] md:px-6 md:py-3.5 md:text-[17px]',
  inputBox:
    'rounded-[15px] border-2 border-[#D9D9D9] bg-white px-5 py-4 text-[20px] font-light text-black placeholder:text-[rgba(37,37,37,0.55)] outline-none focus:border-[#081c47]',
} as const
