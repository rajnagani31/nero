import React, { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { getAuthHeaders } from "@/utils/auth";

export const HealthNeroPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const checkHealth = async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/health-neroai", {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setStatus("success");
      } else {
        const errorJson = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMessage(
          errorJson.detail || `HTTP Error ${res.status}: ${res.statusText}`
        );
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to reach NeroAI backend on port 8080.");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 font-sans flex items-center justify-center">
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-lg p-8 max-w-xl w-full space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#333333] pb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-[#22C55E]" />
            <h1 className="text-xl font-bold text-gray-100">NeroAI Health Check</h1>
          </div>
          <button
            onClick={checkHealth}
            className="p-2 rounded bg-[#2A2A2A] hover:bg-[#333333] transition-colors text-gray-300"
            title="Re-check Health"
          >
            <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
          </button>
        </div>

        {status === "loading" && (
          <div className="flex items-center gap-3 text-gray-400 py-6 justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#22C55E]" />
            <span>Communicating with NeroAI Backend (:8080)...</span>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#22C55E] bg-[#22C55E]/10 p-3 rounded border border-[#22C55E]/20 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>NeroAI Backend Connected & Authenticated Successfully!</span>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Response Payload (JWT Decoded Data)
              </label>
              <pre className="bg-[#121212] border border-[#333333] p-4 rounded text-xs text-green-400 font-mono overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded border border-red-500/20 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Connection / Auth Failed</span>
            </div>

            <div className="bg-[#121212] border border-red-900/40 p-4 rounded text-xs text-red-400 font-mono">
              {errorMessage}
            </div>

            <p className="text-xs text-gray-400">
              Ensure NeroAI backend is running: <br />
              <code className="text-gray-200">python -m uvicorn apps.backend.agents.pr_reviewer_agent.apps.main:app --reload --port 8080</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
