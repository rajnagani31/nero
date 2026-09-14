import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { authFetch } from "@/utils/auth";

export const GithubCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const installationId = urlParams.get("installation_id");

        if (!installationId) {
          setStatus("error");
          setErrorMessage("No installation_id parameter found in callback URL.");
          setTimeout(() => navigate("/dashboard/repositories"), 3000);
          return;
        }

        const res = await authFetch(`/api/github/callback?installation_id=${installationId}`);

        if (res.ok) {
          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard/repositories");
          }, 1200);
        } else if (res.status === 401) {
          setStatus("error");
          setErrorMessage("Authentication required. Please sign in to link your GitHub installation.");
          const currentTarget = window.location.pathname + window.location.search;
          setTimeout(() => {
            navigate(`/login?redirect=${encodeURIComponent(currentTarget)}`);
          }, 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus("error");
          setErrorMessage(data.detail || "Failed to synchronize GitHub installation.");
          setTimeout(() => navigate("/dashboard/repositories"), 3000);
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "Network error connecting to backend.");
        setTimeout(() => navigate("/dashboard/repositories"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4 font-sans">
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-lg p-8 max-w-md w-full text-center space-y-4 shadow-xl">
        {status === "loading" && (
          <>
            <RefreshCw className="w-12 h-12 text-[#22C55E] animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-gray-100">Connecting GitHub App...</h2>
            <p className="text-sm text-gray-400">
              Synchronizing repositories and linking your account session.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto" />
            <h2 className="text-xl font-bold text-gray-100">Successfully Connected!</h2>
            <p className="text-sm text-gray-400">
              Redirecting to your connected repositories dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-100">Connection Issue</h2>
            <p className="text-sm text-red-400">{errorMessage}</p>
            <p className="text-xs text-gray-500">Redirecting back to dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
};
