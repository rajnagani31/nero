import React from "react";
import { cn } from "@/utils/cn";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedFilterProps<T extends string = string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedFilter<T extends string = string>({
  value,
  options,
  onChange,
  className,
}: SegmentedFilterProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 gap-0.5 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)]",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer min-h-[32px] flex items-center gap-1.5",
              isSelected
                ? "bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold shadow-sm"
                : "text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] hover:bg-[var(--nero-sf2,#1a1a1a)]"
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  isSelected
                    ? "bg-[var(--nero-on,#04130c)]/20 text-[var(--nero-on,#04130c)]"
                    : "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-mu,#9a9a9a)]"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
