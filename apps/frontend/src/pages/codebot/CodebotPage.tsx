import React from "react";
import { useChatState } from "@/features/chat/useChatState";
import { ChatSidebar } from "@/features/chat/ChatSidebar";
import { ChatHeader } from "@/features/chat/ChatHeader";
import { MessageList } from "@/features/chat/MessageList";
import { ChatInput } from "@/features/chat/ChatInput";
import { AuthDialog } from "@/features/chat/AuthDialog";
import { SettingsDialog } from "@/features/chat/SettingsDialog";

export const CodebotPage: React.FC = () => {
  const {
    threads,
    filteredThreads,
    activeThreadId,
    activeThread,
    input,
    setInput,
    mode,
    setMode,
    manualModelSelection,
    setManualModelSelection,
    manualPromptSelection,
    setManualPromptSelection,
    manualWebMode,
    setManualWebMode,
    codeContext,
    setCodeContext,
    showCodeContext,
    setShowCodeContext,
    isStreaming,
    streamProgress,
    error,
    search,
    setSearch,
    sessionUser,
    isLoadingMessages,
    isAuthDialogOpen,
    setIsAuthDialogOpen,
    authView,
    setAuthView,
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    isAuthSubmitting,
    theme,
    setTheme,
    isSettingsOpen,
    setIsSettingsOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isGuestSession,
    messagesEndRef,
    createThread,
    deleteThread,
    startFreshChat,
    stopStreaming,
    sendMessage,
    handleComposerKeyDown,
    openAuthDialog,
    submitAuthForm,
    handleLogout,
    handleGoogleLogin,
    handleThreadSelect,
  } = useChatState();

  return (
    <div
      className="app-shell flex h-screen w-full overflow-hidden bg-[var(--nero-bg,#0a0a0a)] text-[var(--nero-tx,#ededed)] font-sans antialiased"
      data-theme={theme}
      style={{ colorScheme: theme === "white" ? "light" : "dark" }}
    >
      {/* ─── Mobile Sidebar Backdrop ─────────────────────────────── */}
      {isSidebarOpen ? (
        <div
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden cursor-pointer"
        />
      ) : null}

      {/* ─── 1. Left Collapsible Sidebar ─────────────────────────── */}
      <ChatSidebar
        threads={filteredThreads}
        activeThreadId={activeThreadId}
        search={search}
        onSearchChange={setSearch}
        onThreadSelect={handleThreadSelect}
        onNewChat={startFreshChat}
        onDeleteThread={deleteThread}
        sessionUser={sessionUser}
        isGuestSession={isGuestSession}
        onOpenAuth={openAuthDialog}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* ─── 2. Center Chat Canvas ───────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--nero-bg,#0a0a0a)]">
        {/* Chat Top Navigation & Model Controls */}
        <ChatHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          modelSelection={manualModelSelection}
          onModelChange={setManualModelSelection}
          promptSelection={manualPromptSelection}
          onPromptChange={setManualPromptSelection}
          webMode={manualWebMode}
          onWebModeToggle={() =>
            setManualWebMode((prev) => (prev === "on" ? "off" : "on"))
          }
          theme={theme}
          onThemeChange={setTheme}
          threadTitle={activeThread?.title}
        />

        {/* Scrollable Conversation Stream */}
        <MessageList
          activeThread={activeThread}
          isLoadingMessages={isLoadingMessages}
          isStreaming={isStreaming}
          streamProgress={streamProgress}
          onSelectPrompt={(prompt) => void sendMessage(prompt)}
          messagesEndRef={messagesEndRef}
        />

        {/* Bottom Composer & Quick Switchers */}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onKeyDown={handleComposerKeyDown}
          onSend={() => void sendMessage()}
          isStreaming={isStreaming}
          onStop={stopStreaming}
          mode={mode}
          onModeChange={setMode}
          codeContext={codeContext}
          onCodeContextChange={setCodeContext}
          showCodeContext={showCodeContext}
          onToggleCodeContext={() => setShowCodeContext((prev) => !prev)}
          error={error}
          guestMessagesRemaining={
            isGuestSession ? sessionUser?.remainingGuestMessages : null
          }
        />
      </main>

      {/* ─── 3. Account Auth Dialog ───────────────────────────────── */}
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        view={authView}
        onViewChange={setAuthView}
        name={authName}
        onNameChange={setAuthName}
        email={authEmail}
        onEmailChange={setAuthEmail}
        password={authPassword}
        onPasswordChange={setAuthPassword}
        onSubmit={submitAuthForm}
        onGoogleLogin={handleGoogleLogin}
        isSubmitting={isAuthSubmitting}
        error={error}
      />

      {/* ─── 4. Preferences Settings Dialog ───────────────────────── */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        sessionUser={sessionUser}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default CodebotPage;
