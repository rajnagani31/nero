import React from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "green"
    | "gray"
    | "dark"
    | "outline"
    | "admin"
    | "success"
    | "warning"
    | "error"
    | "pill";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "green",
  className,
  children,
  ...props
}) => {
  const variants = {
    green: "bg-[#F0F8F1] text-[#087A55] border border-[#C8E6D0] font-medium tracking-wide rounded-[9999px]",
    gray: "bg-nero-cream text-nero-text-secondary border border-nero-border font-medium rounded-[9999px]",
    dark: "bg-nero-panel text-nero-panel-text border border-neutral-800 font-mono text-[11px] rounded-full",
    outline: "border border-[#DDE5DD] text-nero-text-secondary bg-transparent font-medium rounded-[9999px]",
    admin: "bg-[var(--nero-sf2,#1a1a1a)] text-[var(--nero-mu,#9a9a9a)] border border-[var(--nero-bd,#262626)] rounded-md font-normal text-xs px-2 py-0.5",
    success: "bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] border border-[var(--nero-g,#19e68c)]/30 rounded-md font-medium text-xs px-2 py-0.5",
    warning: "bg-amber-500/10 text-[var(--nero-amb,#ffc857)] border border-amber-500/30 rounded-md font-medium text-xs px-2 py-0.5",
    error: "bg-red-500/10 text-[var(--nero-red,#ff7a7a)] border border-red-500/30 rounded-md font-medium text-xs px-2 py-0.5",
    pill: "bg-[var(--nero-gd,#0f2e22)] text-[var(--nero-g,#19e68c)] rounded-md text-xs font-medium px-2 py-0.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  active = false,
  className,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 min-h-[36px] font-medium border transition-colors cursor-pointer",
        active
          ? "border-[var(--nero-g,#19e68c)] text-[var(--nero-g,#19e68c)] bg-[var(--nero-gd,#0f2e22)]/20"
          : "border-[var(--nero-bd,#262626)] text-[var(--nero-tx,#ededed)] bg-[var(--nero-sf,#111111)] hover:border-[var(--nero-mu,#9a9a9a)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
