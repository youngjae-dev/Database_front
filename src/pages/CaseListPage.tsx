import { Link } from 'react-router-dom'

export function CaseListPage() {
  return (
    <main className="min-h-screen p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold text-black">사건 목록</h1>
          <p className="mt-2 text-[16px] text-[#555]">등록된 사건을 확인합니다.</p>
        </div>
        <Link
          to="/home"
          className="rounded-[8px] bg-[#081c47] px-5 py-3 text-[15px] font-medium text-white"
        >
          홈으로
        </Link>
      </div>
      <section className="overflow-hidden rounded-[10px] border border-[#d9d9d9] bg-white">
        <div className="grid grid-cols-2 bg-[rgba(167,193,255,0.29)] text-center text-[18px] font-medium">
          <div className="border-r border-[#d9d9d9] p-4">사건 번호</div>
          <div className="p-4">사건 이름</div>
        </div>
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="grid grid-cols-2 border-t border-[#d9d9d9] text-center text-[15px]">
            <div className="border-r border-[#d9d9d9] p-4">사건 번호</div>
            <div className="p-4">사건 이름</div>
          </div>
        ))}
      </section>
    </main>
  )
}
