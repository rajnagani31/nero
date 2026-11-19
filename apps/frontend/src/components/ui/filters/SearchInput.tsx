import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search pull requests or click to add filters",
  debounceMs = 300,
  className,
}) => {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [internalValue, debounceMs, onChange, value]);

  const handleClear = () => {
    setInternalValue("");
    onChange("");
  };

  return (
    <div
      className={cn(
        "flex-1 min-w-[240px] flex items-center gap-2.5 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] px-3.5 h-10 transition-colors focus-within:border-[var(--nero-mu,#9a9a9a)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-[var(--nero-mu,#9a9a9a)] shrink-0" />
      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 text-sm text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] shrink-0 p-0.5 rounded transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
