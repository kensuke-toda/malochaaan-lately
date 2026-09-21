import Link from "next/link";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-display text-2xl font-semibold">Lately</h1>
      <p className="mb-6 text-sm text-[#6B6258]">アカウントでログインしてください</p>
      <form action={loginAction} className="flex flex-col gap-3 rounded-2xl bg-[#F4EEE4] p-5">
        <input
          type="email"
          name="email"
          placeholder="メールアドレス"
          required
          className="rounded-xl bg-[#E8DFD0] px-3 py-2 text-sm"
        />
        <input
          type="password"
          name="password"
          placeholder="パスワード"
          required
          className="rounded-xl bg-[#E8DFD0] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-full bg-[#B85C38] px-3 py-2.5 text-sm font-semibold text-[#F4EEE4]">
          ログイン
        </button>
        {error === "1" && <p className="text-sm text-[#B85C38]">メールまたはパスワードが違います</p>}
        {error === "config" && (
          <p className="text-sm text-[#B85C38]">Supabase が未設定です。.env.local を確認してください。</p>
        )}
      </form>
      <p className="mt-6 text-xs text-[#6B6258]">アカウントはKenが発行します。サインアップ画面はありません。</p>
      <Link href="/" className="mt-4 text-sm text-[#6B6258] underline">
        TOPへ戻る
      </Link>
    </div>
  );
}
