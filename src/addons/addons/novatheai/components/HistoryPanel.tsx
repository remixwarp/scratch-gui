import * as React from "react";
import shell from "../ui/Shell.module.less";
import { ChatSession } from "../types";
import { AIAssistantIcon } from "./AIAssistantIcon";

interface HistoryPanelProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  msg: (key: string, params?: Record<string, string | number>) => string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  msg,
}) => {
  return (
    <div className={shell.sidebar}>
      <div className={shell.sidebarHeader}>
        <div className={shell.sidebarBrand}>
          <span className={shell.sidebarBrandMark}><AIAssistantIcon /></span>
          <div className={shell.sidebarBrandText}>
            <span className={shell.sidebarBrandTitle}>{msg("sidebar-brand-title")}</span>
            <div className={shell.sidebarBrandSubtitle}>{msg("sidebar-brand-subtitle")}</div>
          </div>
        </div>
      </div>
      <button onClick={onNewChat} className={shell.sidebarNewChat} title={msg("new-chat")}>
        <span className={shell.navIcon}>＋</span>
        <span>{msg("new-chat")}</span>
      </button>
      <div className={shell.sidebarSectionLabel}>{msg("recent")}</div>
      <div className={shell.historyList}>
        {sessions.length === 0 ? <div className={shell.historyEmpty}>{msg("no-sessions")}</div> : null}
        {sessions.map((s) => (
          <button
            type="button"
            key={s.id}
            className={`${shell.historyItem} ${currentSessionId === s.id ? shell.historyItemActive : ""}`}
            onClick={() => onSelectSession(s.id)}
          >
            <span className={shell.historyItemMain}>
              <span className={shell.historyTitle}>{s.title}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              className={shell.deleteSessionButton}
              onClick={(e) => onDeleteSession(s.id, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onDeleteSession(s.id, e as unknown as React.MouseEvent);
                }
              }}
              title={msg("delete-session")}
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
