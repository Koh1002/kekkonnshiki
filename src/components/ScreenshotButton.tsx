"use client";
import { RefObject, useState } from "react";
import { toPng } from "html-to-image";

export function ScreenshotButton({
  targetRef,
  fileName = "kekkon-ranking.png",
  label = "この画面を画像で保存",
}: {
  targetRef: RefObject<HTMLElement>;
  fileName?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function capture() {
    if (!targetRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        backgroundColor: "#0a0608",
      });
      // 1) まずダウンロードを試みる（PC/Android系で有効）
      try {
        const a = document.createElement("a");
        a.download = fileName;
        a.href = dataUrl;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // noop: iOS Safari などではこの方式が使えないためプレビューに回す
      }
      // 2) 保存できなかった端末向けにプレビューも提示（長押しで保存）
      setPreview(dataUrl);
    } catch (e) {
      console.error(e);
      alert("画像の生成に失敗しました。再度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={capture}
        disabled={busy}
        className="px-5 py-3 rounded-md border-2 border-amber-400 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-bold disabled:opacity-50"
      >
        {busy ? "生成中…" : `📸 ${label}`}
      </button>
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="保存用プレビュー"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[80vh] rounded border border-amber-500/40 shadow-2xl"
          />
          <p className="mt-4 text-amber-100 text-center text-sm">
            スマートフォンの方はこの画像を<strong className="text-amber-300">長押し</strong>して保存してください。<br />
            画面外をタップすると閉じます。
          </p>
        </div>
      )}
    </>
  );
}
