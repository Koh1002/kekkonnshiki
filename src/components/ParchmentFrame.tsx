import { ReactNode } from "react";

// 金の額縁＋深紅の中身。芸能人格付けチェック風のテイスト。
// 旧名 ParchmentFrame は互換のため踏襲（呼び出し側は触らずに済む）。
export function ParchmentFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="gold-frame p-6 sm:p-10">{children}</div>
    </div>
  );
}
