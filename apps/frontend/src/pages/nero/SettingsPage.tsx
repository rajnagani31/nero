import React from "react";
import { Key, Webhook } from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1F1F1F] border border-[#333333] p-4 rounded-[3px]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#F2F2F2]">
            Settings & Integrations
          </h1>
          <p className="text-xs text-[#9A9A9A] mt-0.5">
            Configure GitHub App webhooks, REST API keys, and workspace permissions.
          </p>
        </div>
        <span className="text-xs font-mono text-[#22C993]">● Webhook Active</span>
      </div>

      {/* GitHub Integration Card */}
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <div className="flex items-center gap-3">
            <Webhook className="w-4 h-4 text-[#078A62]" />
            <div>
              <h3 className="font-bold text-sm text-[#F2F2F2]">GitHub App Webhook Endpoint</h3>
              <p className="text-xs text-[#9A9A9A]">Receives PR diff events for reasoning</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-[2px] bg-[#22C993]/10 text-[#22C993] border border-[#22C993]/30 text-[10px] font-mono font-bold">
            CONNECTED
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          <label className="text-[#6F6F6F] block">Webhook Target URL</label>
          <input
            type="text"
            readOnly
            value="https://api.nero.ai/api/v1/github/webhook"
            className="w-full bg-[#151515] border border-[#333333] rounded-[2px] p-2.5 text-[#F2F2F2]"
          />
        </div>
      </div>

      {/* API Keys Card */}
      <div className="bg-[#1F1F1F] border border-[#333333] rounded-[3px] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-[#078A62]" />
            <div>
              <h3 className="font-bold text-sm text-[#F2F2F2]">NeroAI Bearer Token</h3>
              <p className="text-xs text-[#9A9A9A]">API key for CI/CD integration</p>
            </div>
          </div>
          <button className="px-3 py-1 rounded-[3px] bg-[#151515] border border-[#333333] text-[#F2F2F2] hover:bg-[#242424] text-xs font-mono">
            Generate Key
          </button>
        </div>

        <div className="font-mono text-xs">
          <input
            type="password"
            readOnly
            value="nero_live_sk_9482019482019482019482"
            className="w-full bg-[#151515] border border-[#333333] rounded-[2px] p-2.5 text-[#F2F2F2]"
          />
        </div>
      </div>
    </div>
  );
};
