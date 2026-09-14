import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error Boundary catch:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#151515] text-[#F2F2F2] p-8 flex flex-col items-center justify-center font-sans space-y-4">
          <div className="max-w-md w-full bg-[#1F1F1F] border border-[#333333] p-6 rounded-[3px] space-y-4">
            <h2 className="text-lg font-bold text-[#D95C5C]">
              Dashboard Component Error
            </h2>
            <p className="text-xs text-[#9A9A9A]">
              An unexpected error occurred while rendering the dashboard view:
            </p>
            <pre className="text-[11px] font-mono bg-[#151515] p-3 border border-[#333333] text-[#D9A441] overflow-x-auto rounded-[2px]">
              {this.state.error?.message || "Unknown rendering exception"}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2 bg-[#078A62] hover:bg-[#0A9B70] text-[#F2F2F2] text-xs font-semibold rounded-[3px] transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
