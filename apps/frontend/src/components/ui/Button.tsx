import React from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-180 ease-out focus:outline-none focus:ring-2 focus:ring-[#087A55]/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-[11px] active:scale-[0.98] group";

  const variants = {
    primary:
      "bg-[#087A55] text-white hover:bg-[#075B49] hover:-translate-y-[1px] shadow-btn",
    secondary:
      "bg-[#111512] text-white hover:bg-black hover:-translate-y-[1px] shadow-subtle",
    outline:
      "bg-white/65 border border-[#DDE5DD] text-[#111512] hover:bg-white hover:border-[#BFD6C4] hover:-translate-y-[1px]",
    ghost:
      "text-nero-text-secondary hover:text-nero-text hover:bg-nero-soft-bg",
    soft:
      "bg-nero-soft text-nero-green border border-nero-soft-border hover:bg-nero-soft/80 font-semibold",
  };

  const sizes = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5 rounded-[8px]",
    md: "text-sm px-5 py-2 gap-2 rounded-[10px]",
    lg: "text-base px-6 py-3 gap-2.5 rounded-[11px] font-semibold",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
