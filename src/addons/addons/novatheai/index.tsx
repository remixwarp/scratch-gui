import * as React from "react";
import styles from "./styles.less";
import themeStyles from "./ui/Theme.module.less";
import shell from "./ui/Shell.module.less";
import { useStoredState } from "./hooks/useStoredState";
import { registerContextMenu } from "./contextMenu";
import { HistoryPanel } from "./components/HistoryPanel";
import { ChatArea } from "./components/ChatArea";
import { InputArea } from "./components/InputArea";
import { AttachmentInteractionLayer } from "./components/AttachmentInteractionLayer";
import { SelectionHint } from "./components/SelectionHint";
import { useAgents } from "./hooks/useAgents";
import { useAttachmentInteraction } from "./hooks/useAttachmentInteraction";
import { useBlockRangeSelection } from "./hooks/useBlockRangeSelection";
import { useChatSessions } from "./hooks/useChatSessions";
import { useChat } from "./hooks/useChat";
import { Attachment, Agent } from "./types";
import { getAttachmentDisplayName } from "./attachmentUtils";
import { exportConversationText } from "./conversationExport";

type SettingsProps = {
  agents: Agent[];
  editingAgent: Agent | null;
  onSaveAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onExportAgent: (id: string) => void;
  onImportAgent: (file: File) => Promise<void>;
  onEditAgent: (agent: Agent | null) => void;
  onClose: () => void;
  msg: (key: string, params?: Record<string, string | number>) => string;
};

let createSettingsWindow: ((props: SettingsProps) => void) | null = null;
let updateSettingsWindow: ((props: Partial<SettingsProps>) => void) | null = null;

export const registerSettingsWindow = (func: (props: SettingsProps) => void) => {
  createSettingsWindow = func;
};

export const registerUpdateSettingsWindow = (func: (props: Partial<SettingsProps>) => void) => {
  updateSettingsWindow = func;
};

type ThemeMode = "dark" | "light";
type AgentProps = PluginContext & { 
  editorThemeMode?: ThemeMode;
  windowWidth?: number;
  windowHeight?: number;
  msg: (key: string, params?: Record<string, string | number>) => string;
};

const NovatheAgent: React.FC<AgentProps> = ({ vm, workspace, editorThemeMode = "light", windowWidth = 800, windowHeight = 600, msg }) => {
  console.log(`[Bilup Nova] Rendering\n vm:`, vm)
  const [isAgentMenuOpen, setIsAgentMenuOpen] = React.useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = React.useState(false);
  const [themeMode, setThemeMode] = React.useState<ThemeMode>(editorThemeMode);
  const agentMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [enableReasoning, setEnableReasoning] = useStoredState<boolean>("NOVA_ENABLE_REASONING", false);
  const [editingAgent, setEditingAgent] = React.useState<Agent | null>(null);

  const useDrawerHistory = windowWidth < 760;

  React.useEffect(() => {
    setThemeMode(editorThemeMode);
  }, [editorThemeMode]);

  const {
    agents,
    flattenedModels,
    currentModelId,
    setCurrentModelId,
    currentAgent,
    handleSaveAgent,
    handleDeleteAgent,
    handleExportAgent,
    handleImportAgents,
  } = useAgents();

  React.useEffect(() => {
    if (updateSettingsWindow) {
      updateSettingsWindow({ agents, editingAgent });
    }
  }, [agents, editingAgent]);

  const {
    sessions,
    currentSessionId,
    currentSession,
    messages,
    isLeftPanelOpen,
    setIsLeftPanelOpen,
    showHistoryModal,
    setShowHistoryModal,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    updateSessionMessages,
    appendSessionSnapshot,
    hasSnapshot,
    rollbackToMessage,
    undoAiChanges,
  } = useChatSessions(useDrawerHistory);

  const { inputText, setInputText, isGenerating, attachments, setAttachments, handleSend, handleStopGenerating } =
    useChat({
      messages,
      currentAgent,
      updateSessionMessages,
      appendSessionSnapshot,
      enableReasoning,
      vm,
      getUnconfiguredMessage: () => msg("agent-unconfigured"),
      undoAiChanges,
    });

  const { previewAttachment, setPreviewAttachment, handleOpenAttachment } = useAttachmentInteraction(vm, workspace);
  const { isSelecting, startSelecting, cancelSelecting } = useBlockRangeSelection({
    workspace,
    vm,
    onRangeSelected: (attachment) => setAttachments((prev) => [...prev, attachment]),
    onSelectionError: (message) => window.alert(message),
  });

  const handleRestoreToUserMessage = React.useCallback(
    async (messageId: string, message: { content: string; attachments?: Attachment[] }) => {
      const result = rollbackToMessage(messageId, message.content, message.attachments || []);
      if (!result) {
        return;
      }

      setInputText(result.inputText);
      setAttachments(result.attachments);

      if (result.snapshot?.projectJson) {
        try {
          const projectData = JSON.parse(result.snapshot.projectJson);
          if (typeof vm?.loadProject === "function") {
            await vm.loadProject(projectData);
          }
        } catch (error) {
          console.error("[Bilup Nova] Failed to restore snapshot", error);
        }
      }
    },
    [rollbackToMessage, setAttachments, setInputText, vm],
  );

  const handleExportConversation = React.useCallback(async () => {
    if (messages.length === 0) {
      window.alert(msg("export-empty"));
      return;
    }

    const exportText = exportConversationText(currentSession, messages);

    const safeTitle = (currentSession?.title || "nova-session")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 48);
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "nova-session"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.alert(msg("export-downloaded", { count: exportText.length.toLocaleString() }));
  }, [currentSession, messages, msg]);

  React.useEffect(() => {
    if (!isAgentMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (agentMenuRef.current?.contains(event.target as Node)) return;
      setIsAgentMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAgentMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAgentMenuOpen]);

  React.useEffect(() => {
    if (!window.Blockly?.ContextMenu) return;

    const contextMenuRegistration = registerContextMenu(vm);

    const handleAddContext = (e: Event) => {
      const customEvent = e as CustomEvent<{
        content: string;
        targetId?: string;
        blockId?: string;
        name?: string;
      }>;
      if (customEvent.detail?.content) {
        const attachment: Attachment = {
          id: `${Date.now()}-${customEvent.detail.blockId || "workspace"}`,
          name: customEvent.detail.name || "workspace-ucf",
          kind: "workspace-ucf",
          mimeType: "text/plain",
          content: customEvent.detail.content,
          preview: customEvent.detail.content,
          meta: {
            source: "workspace",
            targetId: customEvent.detail.targetId,
            blockId: customEvent.detail.blockId,
          },
        };
        attachment.name = getAttachmentDisplayName(attachment, vm);
        console.log("[Bilup Nova Jump][index] attachment added to chat", attachment);
        setAttachments((prev) => [...prev, attachment]);
      }
    };

    window.addEventListener("nova-add-context", handleAddContext);

    return () => {
      contextMenuRegistration.dispose();
      window.removeEventListener("nova-add-context", handleAddContext);
    };
  }, [vm, workspace, setAttachments]);

  return (
    <div
      className={`${styles.container} ${shell.appShell} ${themeStyles.themeRoot} ${
        themeMode === "dark" ? themeStyles.themeDark : themeStyles.themeLight
      }`}
    >
      {/* Left Panel */}
      {!useDrawerHistory && isLeftPanelOpen && (
        <HistoryPanel
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          msg={msg}
        />
      )}

      {/* Right Panel */}
      <div className={shell.mainPanel}>
        <div className={shell.topBar}>
          <div className={shell.topBarMain}>
            <div className={shell.topBarLeft}>
              <button
                type="button"
                className={shell.iconButton}
                onClick={() => setIsLeftPanelOpen((previous) => !previous)}
                title={isLeftPanelOpen ? msg("collapse-sidebar") : msg("expand-sidebar")}
              >
                {useDrawerHistory ? "☰" : isLeftPanelOpen ? "←" : "☰"}
              </button>
              <div className={shell.workspaceTitle}>
                <span>Bilup Nova</span>
                <small>{msg("scratch-code-live-blocks")}</small>
              </div>
            </div>
            <div className={shell.topBarCenter}>
              <div className={shell.modelSelector} ref={agentMenuRef}>
                <button
                  type="button"
                  className={`${shell.modelSelectorTrigger} ${isAgentMenuOpen ? shell.modelSelectorTriggerActive : ""}`}
                  onClick={() => setIsAgentMenuOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isAgentMenuOpen}
                  title={currentAgent?.displayName || msg("select-model")}
                >
                  <span className={shell.modelSelectorText}>{currentAgent?.displayName || msg("no-model-selected")}</span>
                  <span className={shell.modelSelectorChevron}>{isAgentMenuOpen ? "▴" : "▾"}</span>
                </button>
                {isAgentMenuOpen ? (
                  <div className={shell.modelMenu} role="listbox" aria-label={msg("select-model")}>
                    {flattenedModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`${shell.modelMenuItem} ${
                          model.id === currentAgent?.id ? shell.modelMenuItemActive : ""
                        }`}
                        onClick={() => {
                          setCurrentModelId(model.id);
                          setIsAgentMenuOpen(false);
                        }}
                        role="option"
                        aria-selected={model.id === currentAgent?.id}
                        title={`${model.displayName} (${model.modelName})`}
                      >
                        <span>{model.displayName}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={shell.topBarActions}>
            <button
              type="button"
              className={shell.secondaryButton}
              onClick={() => void handleExportConversation()}
              title={msg("export-session-tooltip")}
            >
              {msg("export-session")}
            </button>
            <button 
              type="button" 
              className={shell.secondaryButton} 
              onClick={() => {
                if (createSettingsWindow) {
                  createSettingsWindow({
                    agents,
                    editingAgent,
                    onSaveAgent: (agent) => {
                      handleSaveAgent(agent);
                      setEditingAgent(null);
                    },
                    onDeleteAgent: handleDeleteAgent,
                    onExportAgent: handleExportAgent,
                    onImportAgent: handleImportAgents,
                    onEditAgent: setEditingAgent,
                    onClose: () => setEditingAgent(null),
                    msg,
                  });
                }
              }}
            >
              {msg("settings")}
            </button>
          </div>
        </div>

        <ChatArea
          messages={messages}
          isGenerating={isGenerating}
          vm={vm}
          themeMode={themeMode}
          onOpenWorkspaceAttachment={handleOpenAttachment}
          onRestoreToUserMessage={handleRestoreToUserMessage}
          hasSnapshot={hasSnapshot}
          msg={msg}
        />

        <SelectionHint visible={isSelecting} />

        <InputArea
          inputText={inputText}
          setInputText={setInputText}
          attachments={attachments}
          setAttachments={setAttachments}
          onSend={handleSend}
          onStopGenerating={handleStopGenerating}
          onStartBlockSelection={startSelecting}
          onCancelBlockSelection={cancelSelecting}
          isSelectingBlocks={isSelecting}
          enableReasoning={enableReasoning}
          onToggleReasoning={() => setEnableReasoning((previous) => !previous)}
          onOpenAttachment={handleOpenAttachment}
          isGenerating={isGenerating}
          isExpanded={isComposerExpanded}
          onToggleExpanded={() => setIsComposerExpanded((previous) => !previous)}
          vm={vm}
          msg={msg}
        />

        <AttachmentInteractionLayer
          previewAttachment={previewAttachment}
          onClosePreview={() => setPreviewAttachment(null)}
        />

        {/* History Modal for Narrow Screen */}
        {useDrawerHistory && isLeftPanelOpen && (
          <div className={shell.drawerOverlay} onClick={() => setIsLeftPanelOpen(false)}>
            <div className={shell.historyDrawer} onClick={(e) => e.stopPropagation()}>
              <HistoryPanel
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={handleNewChat}
                onSelectSession={(id) => {
                  handleSelectSession(id);
                  setIsLeftPanelOpen(false);
                }}
                onDeleteSession={handleDeleteSession}
                msg={msg}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Agent.displayName = "Nova";

export default NovatheAgent;
