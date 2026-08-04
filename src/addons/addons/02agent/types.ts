export interface AgentModel {
  id: string;
  name: string;
  modelId: string;
  maxTokens?: number;
}

export interface Agent {
  id: string;
  provider: "openai" | "zhipu" | "deepseek" | "custom" | "custom_anthropic" | "anthropic" | "google" | "azure" | "siliconflow";
  baseUrl: string;
  apiKey: string;
  name: string;
  models: AgentModel[];
  /**
   * 不可编辑的系统 Agent。
   * - 不显示「编辑」「删除」按钮
   * - 名称 / Base URL / API Key / 供应商字段在表单中隐藏或禁用
   * - 模型的显示名称与模型ID只读（仅 maxTokens 可编辑）
   * - 导入、保存等钩子也会拒绝修改 immutable Agent
   */
  immutable?: boolean;
  /**
   * 在设置中是否显示为系统 AI（可展示一个小的系统徽章）
   */
  builtin?: boolean;
}

export interface FlattenedAgent {
  id: string;
  agentId: string;
  provider: Agent["provider"];
  baseUrl: string;
  apiKey: string;
  modelName: string;
  displayName: string;
  maxTokens?: number;
}

export type AttachmentKind = "workspace-ucf" | "workspace-ucf-range" | "text-file" | "spreadsheet" | "document";

export interface Attachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  content: string;
  preview?: string;
  meta?: {
    targetId?: string;
    blockId?: string;
    startBlockId?: string;
    endBlockId?: string;
    topBlockId?: string;
    selectedBlockIds?: string[];
    blockCount?: number;
    source?: string;
  };
}

export interface ToolCall {
  id: string;
  type?: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  reasoning?: string;
  anthropic_content_blocks?: Array<
    | { type: "text"; text: string }
    | { type: "thinking"; thinking: string; signature?: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  >;
  reasoningStartedAt?: number;
  reasoningEndedAt?: number;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
  attachments?: Attachment[];
}

export interface SessionSnapshot {
  messageId: string;
  projectJson: string;
  attachments: Attachment[];
  inputText: string;
  createdAt: number;
}

export interface RangeAttachmentMeta {
  targetId: string;
  startBlockId: string;
  endBlockId: string;
  topBlockId?: string;
  selectedBlockIds?: string[];
  blockCount?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}
