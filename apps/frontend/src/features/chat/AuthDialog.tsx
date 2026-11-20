import React from "react";
import { X, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/utils/cn";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  view: "login" | "signup";
  onViewChange: (view: "login" | "signup") => void;
  name: string;
  onNameChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  onSubmit: () => void;
  onGoogleLogin: () => void;
  isSubmitting: boolean;
  error?: string;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  onClose,
  view,
  onViewChange,
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  onSubmit,
  onGoogleLogin,
  isSubmitting,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf,#111111)] p-6 text-[var(--nero-tx,#ededed)] shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--nero-g,#19e68c)]">
              Authentication
            </span>
            <h2 className="text-lg font-bold tracking-tight text-[var(--nero-tx,#ededed)] mt-0.5">
              {view === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-xs text-[var(--nero-mu,#9a9a9a)] mt-1">
              {view === "signup"
                ? "Preserve your guest conversations and unlock unlimited AI tokens."
                : "Sign in to access your saved threads and repositories."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--nero-mu,#9a9a9a)] hover:text-[var(--nero-tx,#ededed)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {error ? (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        ) : null}

        {/* Form Fields */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-3"
        >
          {view === "signup" ? (
            <div>
              <label className="block text-[11px] font-mono text-[var(--nero-mu,#9a9a9a)] mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Raj Nagani"
                className="w-full h-9 px-3 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none focus:border-[var(--nero-g,#19e68c)] transition-colors"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-mono text-[var(--nero-mu,#9a9a9a)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="developer@example.com"
              required
              className="w-full h-9 px-3 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none focus:border-[var(--nero-g,#19e68c)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--nero-mu,#9a9a9a)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full h-9 px-3 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs text-[var(--nero-tx,#ededed)] placeholder:text-[var(--nero-mu,#9a9a9a)] outline-none focus:border-[var(--nero-g,#19e68c)] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-[var(--nero-g,#19e68c)] text-[var(--nero-on,#04130c)] font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-sm"
          >
            {view === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{isSubmitting ? "Submitting…" : view === "signup" ? "Sign Up" : "Login"}</span>
          </button>
        </form>

        {/* Google OAuth Option */}
        <div className="pt-2 border-t border-[var(--nero-bd,#262626)]">
          <button
            type="button"
            onClick={onGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-[var(--nero-bd,#262626)] bg-[var(--nero-sf2,#1a1a1a)] text-xs font-medium text-[var(--nero-tx,#ededed)] hover:border-[var(--nero-mu,#9a9a9a)] transition-colors cursor-pointer"
          >
            <span>Continue with Google</span>
          </button>
        </div>

        {/* View Switcher Footer */}
        <div className="text-center pt-1 text-xs text-[var(--nero-mu,#9a9a9a)]">
          {view === "signup" ? (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => onViewChange("login")}
                className="text-[var(--nero-g,#19e68c)] font-semibold hover:underline cursor-pointer"
              >
                Login
              </button>
            </span>
          ) : (
            <span>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => onViewChange("signup")}
                className="text-[var(--nero-g,#19e68c)] font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
