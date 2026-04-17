import Link from "next/link";
import { ParchmentFrame } from "@/components/ParchmentFrame";

export default function Home() {
  return (
    <main className="min-h-screen parchment-dark flex items-center justify-center p-6">
      <ParchmentFrame className="max-w-xl w-full">
        <div className="text-center space-y-6">
          <div className="font-display text-amber-300 tracking-[0.3em] text-xs animate-shimmer">
            ROYAL COURT
          </div>
          <h1 className="font-display text-amber-200 text-3xl sm:text-5xl leading-tight">
            宮廷 格付け会
          </h1>
          <p className="text-amber-100/80 text-base sm:text-lg leading-relaxed">
            高貴なる皆さまをお招きし、<br />
            真の「格」を見極めし宴を催しまする。
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/join"
              className="btn-big block w-full rounded-md border border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 transition-all flex items-center justify-center"
            >
              参加のお手続きへ
            </Link>
            <Link
              href="/admin"
              className="block text-center text-amber-400/70 hover:text-amber-300 text-sm underline underline-offset-4"
            >
              司会者（管理者）入口
            </Link>
          </div>
        </div>
      </ParchmentFrame>
    </main>
  );
}
