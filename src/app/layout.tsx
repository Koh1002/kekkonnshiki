import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "宮廷格付け会 | 結婚式余興",
  description: "A or B を選びて、真の高貴を見極めよ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
