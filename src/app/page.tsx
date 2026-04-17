import Link from "next/link";
import { ParchmentFrame } from "@/components/ParchmentFrame";

export default function Home() {
  return (
    <main className="min-h-screen parchment-dark flex items-center justify-center p-4 sm:p-6">
      <ParchmentFrame className="max-w-2xl w-full">
        <div className="text-center space-y-6">
          <div className="font-display text-amber-300 tracking-[0.3em] text-xs animate-shimmer">
            ROYAL COURT
          </div>
          <h1 className="font-display text-amber-200 text-3xl sm:text-5xl leading-tight">
            宮廷 格付け会
          </h1>
          <p className="text-amber-100/80 text-sm sm:text-base leading-relaxed">
            高貴なる皆さまをお招きし、<br />
            真の「格」を見極めし宴を催しまする。
          </p>

          <div className="border-t border-amber-500/30 pt-5 text-left space-y-4">
            <h2 className="font-display text-amber-300 text-center tracking-widest text-sm">
              — あそびかた —
            </h2>
            <ol className="space-y-3 text-amber-100/90 text-sm sm:text-base leading-relaxed">
              <li className="flex gap-3">
                <span className="font-display text-amber-300 shrink-0">Ⅰ.</span>
                <span>
                  司会が問題を読み上げます。画面にはＡ・Ｂの2つの選択肢が現れますので、<strong className="text-amber-200">お好きな方を一度だけタップ</strong>してください。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-amber-300 shrink-0">Ⅱ.</span>
                <span>
                  各問題には<strong className="text-amber-200">制限時間</strong>がございます。時間内にご回答を。（未回答は不正解扱い）
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-amber-300 shrink-0">Ⅲ.</span>
                <span>
                  皆さま全員 <strong className="text-amber-200">「二流貴族」</strong> からのスタート。正解で1つ昇格、不正解で1つ降格いたします。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-amber-300 shrink-0">Ⅳ.</span>
                <span>
                  格は5段階。 王族 &gt; 一流貴族 &gt; 二流貴族 &gt; 三流貴族 &gt; ご愛敬枠。最高位 <strong className="text-amber-200">「王族」</strong> の座を目指しませ。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-amber-300 shrink-0">Ⅴ.</span>
                <span>
                  画面の進行は司会者が司ります。<strong className="text-amber-200">お手元で「次へ」は不要</strong>、ただお待ちください。
                </span>
              </li>
            </ol>
          </div>

          <div className="pt-2">
            <Link
              href="/join"
              className="btn-big block w-full rounded-md border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 transition-all flex items-center justify-center"
            >
              参加のお手続きへ
            </Link>
            <p className="text-amber-300/60 text-xs mt-3">
              お名前だけで参加できます。メールアドレスや電話番号は頂戴いたしません。
            </p>
          </div>
        </div>
      </ParchmentFrame>
    </main>
  );
}
