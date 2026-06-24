import * as React from "react";
import toolStyles from "../ui/ToolCalls.module.less";
import { ChatMessage, ToolCall } from "../types";

interface ToolCallViewerProps {
  toolCalls: ToolCall[];
  toolResults?: ChatMessage[];
  isGenerating?: boolean;
  msg: (key: string, params?: Record<string, string | number>) => string;
}

type ToolCallStatus = "running" | "success" | "error";
type DiffLineKind = "add" | "delete" | "context" | "meta";

interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffFile {
  path: string;
  added: number;
  deleted: number;
  lines: DiffLine[];
  truncated: boolean;
}

interface ToolEntry {
  id: string;
  name: string;
  args: any;
  rawArguments: string;
  formattedArguments: string;
  result?: any;
  rawResult: string;
  formattedResult: string;
  status: ToolCallStatus;
  summary: string;
}

const MAX_DIFF_LINES = 180;

const safeParseJson = (value: string) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const tryFormatJson = (value: string) => {
  if (!value) return "";
  const parsed = safeParseJson(value);
  return parsed === undefined ? value : JSON.stringify(parsed, null, 2);
};

const stringifyCompact = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getToolCallStatus = (result?: ChatMessage): ToolCallStatus => {
  if (!result) return "running";
  if (result.content.startsWith("Error:")) return "error";

  const parsed = safeParseJson(result.content);
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    return parsed.success ? "success" : "error";
  }

  return "success";
};

const asArray = (value: any) => (Array.isArray(value) ? value : []);

const getToolSummary = (name: string, args: any, result: any, status: ToolCallStatus, msg: (key: string, params?: Record<string, string | number>) => string) => {
  if (status === "running") return msg("tool-running");
  if (status === "error") {
    return result?.error || result?.message || msg("tool-fail");
  }

  switch (name) {
    case "applyPatch": {
      const files = asArray(result?.changedFiles);
      const operationCount = Number(result?.scriptOperationCount || 0);
      if (files.length > 0) {
        return msg("tool-sync-success", { fileCount: files.length, operationCount });
      }
      return msg("tool-patch-applied");
    }
    case "getDiagnostics":
      return result?.valid ? msg("tool-diagnostics-pass") : msg("tool-diagnostics-fail");
    case "readFile":
      return msg("tool-file-read", { path: result?.path || args?.path || msg("label-file"), startLine: result?.startLine || 1, endLine: result?.endLine || result?.totalLines || "?" });
    case "searchFiles":
    case "searchBlocks":
      return msg("tool-search-results", { count: result?.matchCount ?? asArray(result?.matches).length ?? 0 });
    case "getBlockHelp":
      return result?.success ? msg("tool-block-help-success", { block: result?.dslCall || args?.opcode || msg("tool-get-block-help") }) : msg("tool-block-help-fail");
    case "getScratchGuide":
      return msg("tool-guide-read", { title: result?.title || result?.topic || args?.topic || msg("tool-get-scratch-guide") });
    case "getProjectOverview":
      return msg("tool-project-overview", { count: asArray(result?.files).length });
    case "listFiles":
      return msg("tool-list-files-result", { count: Array.isArray(result) ? result.length : asArray(result?.files).length });
    default:
      return msg("tool-complete");
  }
};

const buildEntries = (toolCalls: ToolCall[], toolResults: ChatMessage[], msg: (key: string, params?: Record<string, string | number>) => string): ToolEntry[] =>
  toolCalls.map((toolCall) => {
    const resultMessage = toolResults.find((item) => item.tool_call_id === toolCall.id);
    const args = safeParseJson(toolCall.function.arguments) ?? {};
    const result = safeParseJson(resultMessage?.content || "");
    const status = getToolCallStatus(resultMessage);
    return {
      id: toolCall.id,
      name: toolCall.function.name,
      args,
      rawArguments: toolCall.function.arguments,
      formattedArguments: tryFormatJson(toolCall.function.arguments),
      result,
      rawResult: resultMessage?.content || "",
      formattedResult: tryFormatJson(resultMessage?.content || ""),
      status,
      summary: getToolSummary(toolCall.function.name, args, result, status, msg),
    };
  });

const getStatusLabel = (status: ToolCallStatus, msg: (key: string) => string) => {
  switch (status) {
    case "running": return msg("tool-running-status");
    case "success": return msg("tool-success");
    case "error": return msg("tool-error");
  }
};

const getToolLabel = (name: string, msg: (key: string) => string) => {
  switch (name) {
    case "applyPatch": return msg("tool-apply-patch");
    case "getDiagnostics": return msg("tool-get-diagnostics");
    case "readFile": return msg("tool-read-file");
    case "readVariable": return msg("tool-read-variable");
    case "readListSlice": return msg("tool-read-list-slice");
    case "searchList": return msg("tool-search-list");
    case "getDataSummary": return msg("tool-get-data-summary");
    case "searchFiles": return msg("tool-search-files");
    case "searchBlocks": return msg("tool-search-blocks");
    case "getBlockHelp": return msg("tool-get-block-help");
    case "getScratchGuide": return msg("tool-get-scratch-guide");
    case "getProjectOverview": return msg("tool-get-project-overview");
    case "listFiles": return msg("tool-list-files");
    case "searchExtensions": return msg("tool-search-extensions");
    case "installExtension": return msg("tool-install-extension");
    case "createSpriteWithSvg": return msg("tool-create-sprite-with-svg");
    case "updateSpriteProperties": return msg("tool-update-sprite-properties");
    case "listCostumes": return msg("tool-list-costumes");
    case "addCostumeWithSvg": return msg("tool-add-costume-with-svg");
    case "batchAddCostumesWithSvg": return msg("tool-batch-add-costumes-with-svg");
    case "deleteCostume": return msg("tool-delete-costume");
    case "batchDeleteCostumes": return msg("tool-batch-delete-costumes");
    case "reorderCostume": return msg("tool-reorder-costume");
    case "setCostumeOrder": return msg("tool-set-costume-order");
    case "deleteSprite": return msg("tool-delete-sprite");
    case "undoAiChanges": return msg("tool-undo-ai-changes");
    default: return name;
  }
};

const parsePatchDiff = (patch: string): DiffFile[] => {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let oldLine = 0;
  let newLine = 0;

  String(patch || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line) => {
      if (line.startsWith("*** Update File:")) {
        current = {
          path: line.slice("*** Update File:".length).trim(),
          added: 0,
          deleted: 0,
          lines: [],
          truncated: false,
        };
        files.push(current);
        oldLine = 0;
        newLine = 0;
        return;
      }

      if (!current || line === "*** Begin Patch" || line === "*** End Patch") return;

      if (current.lines.length >= MAX_DIFF_LINES) {
        current.truncated = true;
        return;
      }

      const hunkMatch = /^@@(?:\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?)?/.exec(line);
      if (hunkMatch) {
        oldLine = Number(hunkMatch[1] || 0);
        newLine = Number(hunkMatch[2] || 0);
        current.lines.push({ kind: "meta", text: line || "@@" });
        return;
      }

      if (line.startsWith("+")) {
        current.added += 1;
        current.lines.push({ kind: "add", text: line.slice(1), newLine: newLine || undefined });
        if (newLine) newLine += 1;
        return;
      }

      if (line.startsWith("-")) {
        current.deleted += 1;
        current.lines.push({ kind: "delete", text: line.slice(1), oldLine: oldLine || undefined });
        if (oldLine) oldLine += 1;
        return;
      }

      if (line.startsWith(" ")) {
        current.lines.push({
          kind: "context",
          text: line.slice(1),
          oldLine: oldLine || undefined,
          newLine: newLine || undefined,
        });
        if (oldLine) oldLine += 1;
        if (newLine) newLine += 1;
        return;
      }

      current.added += 1;
      current.lines.push({ kind: "add", text: line, newLine: newLine || undefined });
      if (newLine) newLine += 1;
    });

  return files.filter((file) => file.path);
};

const collectChangedFiles = (entries: ToolEntry[]) => {
  const byPath = new Map<string, { path: string; added: number; deleted: number; operations: number }>();

  entries.forEach((entry) => {
    if (entry.name !== "applyPatch") return;
    const diffFiles = parsePatchDiff(entry.args?.patch || "");
    diffFiles.forEach((file) => {
      const existing = byPath.get(file.path) || { path: file.path, added: 0, deleted: 0, operations: 0 };
      existing.added += file.added;
      existing.deleted += file.deleted;
      byPath.set(file.path, existing);
    });
    asArray(entry.result?.syncResults).forEach((syncResult: any) => {
      const path = syncResult?.path;
      if (!path) return;
      const existing = byPath.get(path) || { path, added: 0, deleted: 0, operations: 0 };
      existing.operations += Number(syncResult?.operationCount || 0);
      byPath.set(path, existing);
    });
  });

  return [...byPath.values()];
};

const countDiagnostics = (entries: ToolEntry[]) =>
  entries.reduce(
    (acc, entry) => {
      const diagnostics = asArray(entry.result?.diagnostics);
      diagnostics.forEach((item: any) => {
        acc.errors += asArray(item?.errors).length;
        acc.warnings += asArray(item?.warnings).length;
      });
      return acc;
    },
    { errors: 0, warnings: 0 },
  );

const ToolIcon = ({ status }: { status: ToolCallStatus }) => (
  <span className={`${toolStyles.toolCallGlyph} ${toolStyles[`toolCallGlyph${status}`]}`}>
    {status === "running" ? "" : status === "success" ? (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    )}
  </span>
);

const renderDiff = (entry: ToolEntry, msg: (key: string) => string) => {
  const diffFiles = parsePatchDiff(entry.args?.patch || "");
  if (diffFiles.length === 0) return null;

  return (
    <div className={toolStyles.diffStack}>
      {diffFiles.map((file) => (
        <details key={file.path} className={toolStyles.diffFile} open={diffFiles.length <= 2}>
          <summary className={toolStyles.diffFileHeader}>
            <span className={toolStyles.diffFilePath}>{file.path}</span>
            <span className={toolStyles.diffStats}>
              <span className={toolStyles.diffAdded}>+{file.added}</span>
              <span className={toolStyles.diffDeleted}>-{file.deleted}</span>
            </span>
          </summary>
          <div className={toolStyles.diffBody}>
            {file.lines.map((line, index) => (
              <div key={`${file.path}-${index}`} className={`${toolStyles.diffLine} ${toolStyles[`diffLine${line.kind}`]}`}>
                <span className={toolStyles.diffLineNumber}>{line.oldLine ?? ""}</span>
                <span className={toolStyles.diffLineNumber}>{line.newLine ?? ""}</span>
                <span className={toolStyles.diffMarker}>
                  {line.kind === "add" ? "+" : line.kind === "delete" ? "-" : line.kind === "meta" ? "·" : " "}
                </span>
                <code>{line.text || " "}</code>
              </div>
            ))}
            {file.truncated ? <div className={toolStyles.diffTruncated}>{msg("diff-truncated")}</div> : null}
          </div>
        </details>
      ))}
    </div>
  );
};

const renderResultPreview = (entry: ToolEntry, msg: (key: string, params?: Record<string, string | number>) => string) => {
  if (entry.status === "running") {
    return <div className={toolStyles.toolCallMuted}>{msg("tool-still-running")}</div>;
  }

  if (entry.status === "error") {
    return <div className={toolStyles.toolErrorBox}>{entry.result?.error || entry.rawResult || msg("tool-call-fail")}</div>;
  }

  if (entry.name === "applyPatch") {
    return (
      <div className={toolStyles.toolResultGrid}>
        <span>{msg("label-file")}</span>
        <strong>{asArray(entry.result?.changedFiles).length || parsePatchDiff(entry.args?.patch || "").length}</strong>
        <span>{msg("label-script-operations")}</span>
        <strong>{entry.result?.scriptOperationCount ?? 0}</strong>
      </div>
    );
  }

  if (entry.name === "getDiagnostics") {
    const diagnostics = countDiagnostics([entry]);
    return (
      <div className={toolStyles.toolResultGrid}>
        <span>{msg("label-status")}</span>
        <strong>{entry.result?.valid ? msg("label-pass") : msg("label-need-fix")}</strong>
        <span>{msg("label-errors")}</span>
        <strong>{diagnostics.errors}</strong>
        <span>{msg("label-warnings")}</span>
        <strong>{diagnostics.warnings}</strong>
      </div>
    );
  }

  if (entry.name === "readFile") {
    return (
      <div className={toolStyles.toolResultGrid}>
        <span>{msg("label-path")}</span>
        <strong>{entry.result?.path || entry.args?.path}</strong>
        <span>{msg("label-lines")}</span>
        <strong>{entry.result?.totalLines ?? "?"}</strong>
      </div>
    );
  }

  return <pre className={toolStyles.toolCompactJson}>{entry.formattedResult || msg("no-content")}</pre>;
};

export const ToolCallViewer: React.FC<ToolCallViewerProps> = ({
  toolCalls,
  toolResults = [],
  isGenerating = false,
  msg,
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const [expandedDetails, setExpandedDetails] = React.useState<Record<string, boolean>>({});

  const entries = React.useMemo(() => buildEntries(toolCalls, toolResults, msg), [toolCalls, toolResults, msg]);
  const runningCount = entries.filter((entry) => entry.status === "running").length;
  const successCount = entries.filter((entry) => entry.status === "success").length;
  const errorCount = entries.filter((entry) => entry.status === "error").length;
  const changedFiles = React.useMemo(() => collectChangedFiles(entries), [entries]);
  const diagnostics = React.useMemo(() => countDiagnostics(entries), [entries]);
  const hasRunning = runningCount > 0;

  React.useEffect(() => {
    setExpandedDetails((previous) => {
      let changed = false;
      const next = { ...previous };
      entries.forEach((entry) => {
        if (entry.name === "applyPatch" && entry.status !== "error" && next[entry.id] === undefined) {
          next[entry.id] = true;
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [entries]);

  const toggleDetail = (id: string) => {
    setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getToolStatusText = () => {
    if (hasRunning) return msg("tool-running");
    if (errorCount > 0) return msg("tool-call-fail");
    return msg("tool-complete");
  };

  return (
    <div className={`${toolStyles.toolCallSummary} ${hasRunning ? toolStyles.toolCallSummaryRunning : ""}`}>
      <button type="button" className={toolStyles.toolCallSummaryHeader} onClick={() => setExpanded((prev) => !prev)}>
        <span className={`${toolStyles.toolCallPulse} ${hasRunning ? toolStyles.toolCallPulseActive : ""}`} />
        <span className={toolStyles.toolCallSummaryTitle}>{getToolStatusText()}</span>
        <span className={toolStyles.toolCallSummaryMeta}>
          {msg("tool-calls-count", { count: entries.length })} · {successCount} {msg("tool-success")}
          {errorCount ? ` · ${errorCount} ${msg("tool-error")}` : ""}
        </span>
        <span className={toolStyles.toolCallChevron}>{expanded ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up-icon lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>}</span>
      </button>

      {expanded ? (
        <div className={toolStyles.toolCallBody}>
          {changedFiles.length > 0 || diagnostics.errors > 0 || diagnostics.warnings > 0 ? (
            <div className={toolStyles.toolRunSummary}>
              {changedFiles.length > 0 ? (
                <div className={toolStyles.changedFilesPanel}>
                  <div className={toolStyles.changedFilesHeader}>
                    <strong>{msg("files-changed", { count: changedFiles.length })}</strong>
                    <span>
                      +{changedFiles.reduce((sum, file) => sum + file.added, 0)} -
                      {changedFiles.reduce((sum, file) => sum + file.deleted, 0)}
                    </span>
                  </div>
                  <div className={toolStyles.changedFileList}>
                    {changedFiles.map((file) => (
                      <div key={file.path} className={toolStyles.changedFileItem}>
                        <span>{file.path}</span>
                        <span>
                          <b className={toolStyles.diffAdded}>+{file.added}</b>{" "}
                          <b className={toolStyles.diffDeleted}>-{file.deleted}</b>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {diagnostics.errors > 0 || diagnostics.warnings > 0 ? (
                <div className={toolStyles.diagnosticPills}>
                  <span className={diagnostics.errors > 0 ? toolStyles.diagnosticPillError : toolStyles.diagnosticPillOk}>
                    {diagnostics.errors} {msg("label-errors")}
                  </span>
                  <span className={diagnostics.warnings > 0 ? toolStyles.diagnosticPillWarn : toolStyles.diagnosticPillOk}>
                    {diagnostics.warnings} {msg("label-warnings")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={toolStyles.toolCallList}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`${toolStyles.toolCallItem} ${
                  entry.status === "running" ? toolStyles.toolCallItemRunning : ""
                }`}
              >
                <button type="button" className={toolStyles.toolCallItemHeader} onClick={() => toggleDetail(entry.id)}>
                  <ToolIcon status={entry.status} />
                  <span className={toolStyles.toolCallName}>{getToolLabel(entry.name, msg)}</span>
                  <span className={toolStyles.toolCallSummaryLine}>{entry.summary}</span>
                  <span className={`${toolStyles.toolCallStatus} ${toolStyles[`toolCallStatus${entry.status}`]}`}>
                    {getStatusLabel(entry.status, msg)}
                  </span>
                </button>
                {expandedDetails[entry.id] ? (
                  <div className={toolStyles.toolCallDetail}>
                    {renderDiff(entry, msg)}
                    <div className={toolStyles.toolCallSection}>
                      <div className={toolStyles.toolCallSectionTitle}>{msg("label-status")}</div>
                      {renderResultPreview(entry, msg)}
                    </div>
                    <details className={toolStyles.rawToolDetails}>
                      <summary>原始参数 / 返回</summary>
                      <div className={toolStyles.toolCallRawGrid}>
                        <div className={toolStyles.toolCallSection}>
                          <div className={toolStyles.toolCallSectionTitle}>参数</div>
                          <pre>{entry.formattedArguments || "{}"}</pre>
                        </div>
                        <div className={toolStyles.toolCallSection}>
                          <div className={toolStyles.toolCallSectionTitle}>{msg("label-status")}</div>
                          <pre>{entry.formattedResult || stringifyCompact(entry.rawResult) || msg("no-content")}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
