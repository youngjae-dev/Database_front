import AppShell from '../components/AppShell'

export default function MyPage() {
  return (
    <AppShell active="mypage">
      <div className="p-8">
        <h1 className="text-[40px] font-semibold text-black">마이페이지</h1>
      </div>
    </AppShell>
  )
}
