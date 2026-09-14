import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          display_name: name.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.detail || "Account creation failed. Please check details and try again."
        );
      }

      const data = await res.json();
      const token = data.access_token || data.token;
      if (token) {
        window.localStorage.setItem("codebot_access_token", token);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/google/url");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.detail || "Google signup is currently unavailable."
        );
      }
      const data = await res.json();
      if (data.login_url) {
        window.location.assign(data.login_url);
      } else {
        throw new Error("Google signup URL not available.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google signup failed.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4EA] text-[#111512] font-sans grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand Showcase Column - Perfectly Balanced Sidebar */}
      <div className="lg:col-span-5 bg-[#ECEBE0] text-[#111512] border-b lg:border-b-0 lg:border-r border-[#D9D8C8] p-8 md:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#075B49] flex items-center justify-center text-white font-bold shadow-sm">
            <span className="text-white text-lg font-extrabold">N</span>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#111512]">
            Nero<span className="text-[#087A55]">AI</span>
          </span>
        </Link>

        <div className="my-auto py-10 space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E0EEDF] border border-[#B9DCB8] text-xs font-semibold text-[#075B49]">
            <span>Automated PR & Code Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-[#111512]">
            Give your codebase <br />
            an AI that <span className="text-[#087A55]">understands it.</span>
          </h1>

          <p className="text-[#5A625F] text-base leading-relaxed">
            Join thousands of modern software teams using NeroAI for repository reasoning and automated PR code reviews.
          </p>

          <div className="pt-2 space-y-3.5 text-sm text-[#111512]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#E0EEDF] border border-[#B9DCB8] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#087A55]" />
              </div>
              <span className="font-medium">Free 14-day repository trial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#E0EEDF] border border-[#B9DCB8] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#087A55]" />
              </div>
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#E0EEDF] border border-[#B9DCB8] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#087A55]" />
              </div>
              <span className="font-medium">Seamless GitHub App installation</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#8A918C]">
          © 2026 NeroAI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Signup Column - Spacious Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-[#F5F4EA]">
        <div className="w-full max-w-lg bg-white border border-[#DDDCCF] rounded-2xl p-8 sm:p-10 shadow-xl shadow-[#075B49]/5 space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-[#087A55] tracking-tight">
              Create your NeroAI account
            </h2>
            <p className="text-sm text-[#075B49] font-medium mt-2">
              Start indexing repositories and automating code reviews in minutes.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Signup Option */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-[#DDDCCF] rounded-xl font-semibold text-sm text-[#111512] bg-[#FAF9F2] hover:bg-[#F2F1E5] transition-colors shadow-sm disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 text-[#087A55] animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.2.01 10.04.01 12c0 1.96.46 3.8 1.28 5.42l3.99-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-[#E5E4D8] w-full"></div>
            <span className="bg-white px-3 text-xs font-bold tracking-wider text-[#8A918C] absolute uppercase">
              OR WORK EMAIL
            </span>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A625F] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Denis Smith"
                className="w-full bg-[#FAF9F2] border border-[#DDDCCF] rounded-xl px-4 py-3.5 text-sm text-[#111512] placeholder-[#8A918C] focus:bg-white focus:outline-none focus:border-[#087A55] focus:ring-1 focus:ring-[#087A55] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A625F] mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-[#FAF9F2] border border-[#DDDCCF] rounded-xl px-4 py-3.5 text-sm text-[#111512] placeholder-[#8A918C] focus:bg-white focus:outline-none focus:border-[#087A55] focus:ring-1 focus:ring-[#087A55] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A625F] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#FAF9F2] border border-[#DDDCCF] rounded-xl px-4 py-3.5 text-sm text-[#111512] placeholder-[#8A918C] focus:bg-white focus:outline-none focus:border-[#087A55] focus:ring-1 focus:ring-[#087A55] transition-all"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full mt-2 py-3.5 flex items-center justify-center gap-2 bg-[#087A55] hover:bg-[#075B49] text-white font-bold rounded-xl shadow-md transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-[#5A625F]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#087A55] font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
