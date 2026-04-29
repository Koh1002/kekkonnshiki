import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "一般人 格付けチェック",
  description: "Ａか、Ｂか。あなたの「格」が試されます。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
