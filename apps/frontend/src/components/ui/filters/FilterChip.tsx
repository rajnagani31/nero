import React from "react";
import { cn } from "@/utils/cn";

export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  active = false,
  label,
  count,
  icon,
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 min-h-[36px] border transition-all cursor-pointer select-none",
        active
          ? "border-[var(--nero-g,#19e68c)] text-[var(--nero-g,#19e68c)] bg-[var(--nero-gd,#0f2e22)]/20 shadow-sm"
          : "border-[var(--nero-bd,#262626)] text-[var(--nero-tx,#ededed)] bg-[var(--nero-sf,#111111)] hover:border-[var(--nero-mu,#9a9a9a)]",
        className
      )}
      {...props}
    >
      {icon && <span className="opacity-80">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono",
            active
              ? "bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold"
              : "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-mu,#9a9a9a)]"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};
