import Link from "next/link";
import { ParchmentFrame } from "@/components/ParchmentFrame";

export default function Home() {
  return (
    <main className="min-h-screen velvet flex items-center justify-center p-4 sm:p-6">
      <ParchmentFrame className="max-w-2xl w-full">
        <div className="text-center space-y-5">
          <div className="font-display text-goldleaf-300 tracking-[0.4em] text-xs animate-shimmer">
            ◆ FIRST CLASS CHECK ◆
          </div>
          <div className="title-stage mx-auto">
            <h1 className="title-block text-gold-on-cream text-4xl sm:text-5xl md:text-6xl leading-[1.15]">
              <span className="block">一般人</span>
              <span className="block">格付けチェック</span>
            </h1>
          </div>
          <p className="text-goldleaf-100 text-base sm:text-lg leading-relaxed">
            あなたは一流？<br/>みんなでチェック！
          </p>

          <div className="border-t-2 border-goldleaf-500/40 pt-5 text-left space-y-3">
            <h2 className="font-display text-goldleaf-300 text-center tracking-widest text-sm">
              — あそびかた —
            </h2>
            <ol className="space-y-3 text-goldleaf-50 text-sm sm:text-base leading-relaxed">
              <li className="flex gap-3">
                <span className="font-display text-goldleaf-300 shrink-0 font-black">①</span>
                <span>
                  司会が問題を読み上げます。画面に出る<strong className="text-goldleaf-200">Ａ・Ｂ</strong>のうち、お好きな方を一度だけタップしてください。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-goldleaf-300 shrink-0 font-black">②</span>
                <span>
                  各問題には<strong className="text-goldleaf-200">制限時間</strong>がございます。時間内にご回答を。（未回答は不正解扱い）
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-goldleaf-300 shrink-0 font-black">③</span>
                <span>
                  皆さま全員 <strong className="text-goldleaf-200">「普通の人」</strong> からスタート。正解で1つ昇格、不正解で1つ降格します。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-goldleaf-300 shrink-0 font-black">④</span>
                <span>
                  格は5段階。 一流 &gt; 二流 &gt; 普通の人 &gt; 三流 &gt; ご愛敬枠。最高位 <strong className="text-goldleaf-200">「一流」</strong> の座を目指しませ。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-goldleaf-300 shrink-0 font-black">⑤</span>
                <span>
                  画面の進行は司会者が司ります。<strong className="text-goldleaf-200">お手元で「次へ」は不要</strong>、ただお待ちください。
                </span>
              </li>
            </ol>
          </div>

          <div className="pt-2">
            <Link
              href="/join"
              className="btn-big block w-full rounded-md border-2 border-goldleaf-300 bg-gradient-to-b from-goldleaf-500 to-goldleaf-700 hover:brightness-110 text-velvet-950 font-black transition-all flex items-center justify-center"
            >
              参加のお手続きへ
            </Link>
            <p className="text-goldleaf-200/70 text-xs mt-3">
              お名前だけで参加できます。メールアドレスや電話番号は頂戴いたしません。
            </p>
          </div>
        </div>
      </ParchmentFrame>
    </main>
  );
}
