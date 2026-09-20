import * as React from "react";
import composer from "../ui/Composer.module.less";
import { parseLocalAttachment } from "../attachments";
import { Attachment } from "../types";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { getAttachmentDisplayName } from "../attachmentUtils";
import SendIcon from "../assets/icon-send.svg";
import StopIcon from "../assets/icon-stop.svg";
import ChevronRightIcon from "../assets/icon-chevron-right.svg";

interface InputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  onSend: () => void;
  onStopGenerating: () => void;
  onStartBlockSelection: () => void;
  onCancelBlockSelection: () => void;
  isSelectingBlocks: boolean;
  enableReasoning: boolean;
  onToggleReasoning: () => void;
  onOpenAttachment: (attachment: Attachment) => void;
  isGenerating: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  vm: PluginContext["vm"];
  msg: (key: string, params?: Record<string, string | number>) => string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  inputText,
  setInputText,
  attachments,
  setAttachments,
  onSend,
  onStopGenerating,
  onStartBlockSelection,
  onCancelBlockSelection,
  isSelectingBlocks,
  enableReasoning,
  onToggleReasoning,
  onOpenAttachment,
  isGenerating,
  isExpanded,
  onToggleExpanded,
  vm,
  msg,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [previewAttachment, setPreviewAttachment] = React.useState<Attachment | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const parsedAttachments = await Promise.all(
      files.map(async (file) => {
        try {
          return await parseLocalAttachment(file);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : msg("unknown-error");
          return {
            id: `${Date.now()}-${file.name}`,
            name: file.name,
            kind: "text-file" as const,
            mimeType: file.type || "application/octet-stream",
            content: msg("import-fail", { message }),
            preview: msg("import-fail", { message }),
            meta: {
              source: "local-file",
            },
          };
        }
      }),
    );

    setAttachments((prev) => [...prev, ...parsedAttachments]);
    event.target.value = "";
  };

  return (
    <div className={`${composer.inputArea} ${isExpanded ? composer.inputAreaExpanded : ""}`}>
      {attachments.length > 0 ? (
        <div className={composer.attachments}>
          {attachments.map((attachment) => (
            <div key={attachment.id} className={composer.attachmentItem}>
              <span className={composer.attachmentKind}>
                {attachment.kind === "workspace-ucf-range"
                  ? msg("attachment-workspace-range")
                  : attachment.kind === "workspace-ucf"
                    ? msg("attachment-workspace")
                    : msg("attachment-file")}
              </span>
              <button
                className={composer.inlineTextButton}
                onClick={() => {
                  if (attachment.kind === "workspace-ucf" || attachment.kind === "workspace-ucf-range") {
                    onOpenAttachment(attachment);
                    return;
                  }
                  setPreviewAttachment(attachment);
                }}
                title={getAttachmentDisplayName(attachment, vm)}
              >
                <span className={composer.attachmentName}>{getAttachmentDisplayName(attachment, vm)}</span>
              </button>
              {(attachment.kind === "workspace-ucf" || attachment.kind === "workspace-ucf-range") &&
              attachment.preview ? (
                <button
                  className={composer.attachmentExpandButton}
                  onClick={() => setExpandedId((prev) => (prev === attachment.id ? null : attachment.id))}
                >
                  {expandedId === attachment.id ? msg("attachment-collapse") : msg("attachment-expand")}
                </button>
              ) : null}
              <button
                className={composer.attachmentRemoveButton}
                onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                title={msg("attachment-remove")}
              >
                x
              </button>
              {expandedId === attachment.id && attachment.preview ? (
                <pre className={composer.attachmentPreviewBlock}>{attachment.preview}</pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className={composer.inputBox}>
        <div className={composer.composerTextareaWrap}>
          <textarea
            className={`${composer.composerTextarea} ${isExpanded ? composer.composerTextareaExpanded : ""}`}
            placeholder={msg("input-placeholder")}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (isExpanded) {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  onSend();
                }
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
          />
          <button
            type="button"
            className={composer.composerExpandButton}
            onClick={onToggleExpanded}
            title={isExpanded ? msg("exit-fullscreen") : msg("expand-input")}
            aria-label={isExpanded ? msg("exit-fullscreen") : msg("expand-input")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 2.25H2.75V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 2.25h2.25V4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 11.75H2.75V9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11.75h2.25V9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 2.25 2.25 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M9 2.25 11.75 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M5 11.75 2.25 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M9 11.75 11.75 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className={composer.inputBottomRow}>
          <div className={composer.inputToolsScroller}>
            <div className={composer.inputTools}>
              <button
                type="button"
                className={`${composer.toolButton} ${enableReasoning ? composer.toolButtonActive : ""}`}
                onClick={onToggleReasoning}
                title={msg("toggle-reasoning")}
              >
                {msg("reasoning")}
              </button>
              <button
                type="button"
                className={composer.toolButton}
                onClick={isSelectingBlocks ? onCancelBlockSelection : onStartBlockSelection}
                title={msg("select-blocks-tooltip")}
              >
                {isSelectingBlocks ? msg("cancel-selection") : msg("select-blocks")}
              </button>
              <button
                type="button"
                className={composer.toolButton}
                onClick={() => fileInputRef.current?.click()}
                title={msg("add-file-tooltip")}
              >
                {msg("add-file")}
              </button>
            </div>
          </div>
          <div className={composer.inputComposerActions}>
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGenerating}
                className={`${composer.primaryButton} ${isExpanded ? composer.expandedComposerSendButton : composer.iconButton} ${composer.stopButton}`}
                title={msg("stop-generating")}
                aria-label={msg("stop-generating")}
              >
                <img src={StopIcon} aria-hidden="true" alt="" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                className={`${composer.primaryButton} ${isExpanded ? composer.expandedComposerSendButton : composer.iconButton}`}
                title={msg("send")}
                aria-label={msg("send")}
              >
                <img src={SendIcon} aria-hidden="true" alt="" />
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.json,.js,.ts,.tsx,.jsx,.css,.less,.html,.xml,.yaml,.yml,.csv,.log,.ucf,.docx,.xls,.xlsx,.xlsm,.xlsb,.ods"
        multiple
        className={composer.fileInput}
        onChange={handleFileChange}
      />
      {previewAttachment ? (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      ) : null}
    </div>
  );
};
