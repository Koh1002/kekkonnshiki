import { ReactNode } from "react";

export function ParchmentFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="parchment-dark frame-ornate rounded-xl p-6 sm:p-10 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
