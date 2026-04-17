/* eslint-disable @next/next/no-img-element */
import { rankIconPath, rankName, RANK_LATIN } from "@/lib/ranks";

export function RankIcon({
  level,
  size = 96,
  showLabel = false,
}: {
  level: number;
  size?: number;
  showLabel?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={rankIconPath(level)}
        alt={rankName(level)}
        width={size}
        height={size}
        className="rounded-full border border-amber-500/40 shadow-lg"
      />
      {showLabel && (
        <div className="mt-2 text-center leading-tight">
          <div className="text-amber-300 font-display tracking-widest text-xs">
            {RANK_LATIN[level]}
          </div>
          <div className="text-amber-100 font-bold">{rankName(level)}</div>
        </div>
      )}
    </div>
  );
}
