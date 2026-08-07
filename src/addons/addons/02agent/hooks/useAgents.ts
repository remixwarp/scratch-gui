import { useEffect, useState, useMemo } from "react";
import useStorageInfo from "../shims/hooks/useStorageInfo";
import { Agent, AgentModel, FlattenedAgent } from "../types";
import { PROVIDER_DEFAULT_URLS } from "../constants";
import { getApiKey, getApiConfig } from "../../../../lib/constants/api-keys";

interface ExportedAgentFile {
  version: 1;
  exportedAt: string;
  agent: Agent;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "default-free-chat",
    name: "AI助手",
    provider: "custom",
    baseUrl: "https://aiapi.remix.de5.net/v1/chat/completions",
    apiKey: "sk-remixworld",
    models: [
      {
        id: "default-free-model-1",
        name: "gemma-7b-it（Gemma 7B）",
        modelId: "gemma-7b-it",
      },
    ],
    immutable: true,
    builtin: true,
  },
];

// 系统内置 Agent 的 ID 列表（不可编辑、不可删除）
export const BUILTIN_AGENT_IDS = new Set<string>(
  DEFAULT_AGENTS.filter((a) => a.immutable || a.builtin).map((a) => a.id),
);

// 已被用户主动删除的 builtin Agent ID 列表（持久化在 localStorage 中）
const REMOVED_BUILTIN_AGENTS_KEY = "AI_ASSISTANT_REMOVED_BUILTIN_AGENTS_02";
const readRemovedBuiltinAgentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(REMOVED_BUILTIN_AGENTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
};
const writeRemovedBuiltinAgentIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(REMOVED_BUILTIN_AGENTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // 忽略写入失败
  }
};

/**
 * 确保 immutable Agent 不会被用户编辑过的存储值覆盖。
 * 每次加载存储后，将 immutable Agent 的 id 与 DEFAULT_AGENTS 中相同 id 的对象重置回默认值，
 * 避免用户通过手动改 localStorage 暴露密钥。
 *
 * builtin 但非 immutable 的 Agent（可删除）：
 * - 如果用户在之前主动删除过，则不会自动重新注入；
 * - 否则首次出现时（用户存储中不存在且未被记录为已删除）会自动注入到列表前面。
 */
// 已被移除的内置 Agent ID 列表（旧版本遗留，会被强制从用户存储中清理）
const REMOVED_BUILTIN_AGENT_IDS = new Set<string>(["rw-default"]);

function enforceImmutableDefaults (stored: Agent[]): Agent[] {
  // 先强制清理已被移除的内置 Agent
  const cleaned = stored.filter((a) => !REMOVED_BUILTIN_AGENT_IDS.has(a.id));

  const immutableIndex = new Map(DEFAULT_AGENTS.filter(a => a.immutable).map(a => [a.id, a]));
  const builtinOnlyIndex = new Map(DEFAULT_AGENTS.filter(a => !a.immutable && a.builtin).map(a => [a.id, a]));
  const seenImmutable = new Set<string>();
  const seenBuiltinOnly = new Set<string>();
  const removedBuiltinIds = readRemovedBuiltinAgentIds();
  const next: Agent[] = [];
  for (const agent of cleaned) {
    if (immutableIndex.has(agent.id)) {
      seenImmutable.add(agent.id);
      next.push({ ...immutableIndex.get(agent.id)! });
    } else if (builtinOnlyIndex.has(agent.id)) {
      seenBuiltinOnly.add(agent.id);
      // 即使是 builtin，存储中的值也以默认值为准（避免被改密钥）
      next.push({ ...builtinOnlyIndex.get(agent.id)! });
    } else {
      next.push(agent);
    }
  }
  // 确保所有 immutable Agent 始终出现在列表最前面
  for (const id of immutableIndex.keys()) {
    if (!seenImmutable.has(id)) {
      next.unshift({ ...immutableIndex.get(id)! });
    }
  }
  // 对 builtin（但非 immutable）的 Agent：若用户没有主动删除过，则补齐到列表前面
  for (const id of builtinOnlyIndex.keys()) {
    if (!seenBuiltinOnly.has(id) && !removedBuiltinIds.has(id)) {
      next.unshift({ ...builtinOnlyIndex.get(id)! });
    }
  }
  return next;
}

export function useAgents() {
  // 从存储读取，读取后强制覆盖 immutable Agent，避免用户篡改
  const [storedAgents, setStoredAgents] = useStorageInfo<Agent[]>("AI_ASSISTANT_AGENTS_02", DEFAULT_AGENTS);
  const agents = enforceImmutableDefaults(storedAgents);
  useEffect(() => {
    if (JSON.stringify(storedAgents) !== JSON.stringify(agents)) {
      setStoredAgents(agents);
    }
  }, [storedAgents, agents, setStoredAgents]);

  const setAgents: typeof setStoredAgents = (next) => {
    const coerced = typeof next === "function"
      ? enforceImmutableDefaults((next as any)(storedAgents))
      : enforceImmutableDefaults(next as Agent[]);
    return setStoredAgents(coerced);
  };

  const [currentModelId, setCurrentModelId] = useStorageInfo<string>("AI_ASSISTANT_CURRENT_AGENT_ID_02", "default-free-model-1");
  const [showSettings, setShowSettings] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const flattenedModels = useMemo<FlattenedAgent[]>(() => {
    return agents.flatMap((agent) => {
      // Handle legacy agents without models array
      const models = agent.models || [
        {
          id: `${agent.id}-model`,
          name: (agent as any).displayName || agent.name || "Default Model",
          modelId: (agent as any).modelName || "gpt-3.5-turbo",
          maxTokens: (agent as any).maxTokens,
        },
      ];

      // 如果 API Key 为空，尝试从项目配置中获取
      let effectiveApiKey = agent.apiKey;
      if (!effectiveApiKey || effectiveApiKey.trim() === "") {
        // 尝试从项目中已有的 API 配置获取密钥
        const siliconflowKey = getApiKey('siliconflow');
        if (siliconflowKey) {
          effectiveApiKey = siliconflowKey;
        } else {
          // 尝试使用其他 provider 的密钥
          const openaiKey = getApiKey('openai');
          if (openaiKey) {
            effectiveApiKey = openaiKey;
          }
        }
      }

      return models.map((model) => ({
        id: model.id,
        agentId: agent.id,
        provider: agent.provider,
        baseUrl: agent.baseUrl,
        apiKey: effectiveApiKey,
        modelName: model.modelId,
        displayName: model.name,
        maxTokens: model.maxTokens,
      }));
    });
  }, [agents]);

  const currentAgent = useMemo(() => {
    return flattenedModels.find((model) => model.id === currentModelId) || flattenedModels[0] || null;
  }, [flattenedModels, currentModelId]);

  useEffect(() => {
    // 当 immutable Agent 不存在于列表中时，强制把它放回。
    const rebuilt = enforceImmutableDefaults(agents);
    if (JSON.stringify(rebuilt) !== JSON.stringify(agents)) {
      setStoredAgents(rebuilt);
      if (!rebuilt.some(a => a.models.some(m => m.id === currentModelId))) {
        setCurrentModelId(rebuilt[0]?.models[0]?.id || "default-free-model-1");
      }
    }
  }, [agents, setStoredAgents, currentModelId, setCurrentModelId]);

  const handleSaveAgent = (newAgent: Agent) => {
    // 拒绝覆盖 immutable Agent
    if (BUILTIN_AGENT_IDS.has(newAgent.id)) {
      window.alert("系统内置 AI 不可编辑");
      return;
    }
    const nextAgents = editingAgent
      ? agents.map((agent) => (agent.id === editingAgent.id ? newAgent : agent))
      : [...agents, newAgent];

    setAgents(nextAgents);

    // Select the first model of the new agent if we were not editing or if we are selecting it
    if (!currentModelId || editingAgent?.id === newAgent.id) {
      setCurrentModelId(newAgent.models[0]?.id || "");
    }
    setEditingAgent(null);
  };

  const handleDeleteAgent = (id: string) => {
    const nextAgents = agents.filter((agent) => agent.id !== id);
    if (nextAgents.length === 0) {
      window.alert("至少保留一个 Agent");
      return;
    }

    // 如果删除的是 builtin 但非 immutable 的 Agent，记录到已删除列表，避免下次启动时自动补回
    const deletedAgent = agents.find((a) => a.id === id);
    if (deletedAgent && deletedAgent.builtin && !deletedAgent.immutable) {
      const removedIds = readRemovedBuiltinAgentIds();
      removedIds.add(id);
      writeRemovedBuiltinAgentIds(removedIds);
    }

    setAgents(nextAgents);

    const isCurrentModelDeleted = agents.find(a => a.id === id)?.models.some(m => m.id === currentModelId);

    if (isCurrentModelDeleted) {
      const firstAgent = nextAgents[0];
      setCurrentModelId(firstAgent?.models[0]?.id || "");
    }

    if (editingAgent?.id === id) {
      setEditingAgent(null);
    }
  };

  const handleExportAgent = (agentId: string) => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return;
    if (BUILTIN_AGENT_IDS.has(agentId)) {
      window.alert("系统内置 AI 不允许导出（避免密钥外泄）");
      return;
    }

    // Migrate on export just in case
    const exportAgent = { ...agent };
    if (!exportAgent.models) {
      exportAgent.models = [
        {
          id: `${exportAgent.id}-model`,
          name: (exportAgent as any).displayName || exportAgent.name || "Default Model",
          modelId: (exportAgent as any).modelName || "gpt-3.5-turbo",
          maxTokens: (exportAgent as any).maxTokens,
        },
      ];
    }

    const fileData: ExportedAgentFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: exportAgent,
    };

    const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-agent-${(exportAgent.name || "agent").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || exportAgent.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportAgents = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    let importedAgent = (parsed.agent && typeof parsed.agent === "object" ? parsed.agent : parsed) as Record<
      string,
      unknown
    >;

    if (!importedAgent || typeof importedAgent.provider !== "string" || typeof importedAgent.baseUrl !== "string" || typeof importedAgent.apiKey !== "string") {
      throw new Error("导入失败：文件内容不是有效的 Agent 配置");
    }

    // Handle legacy import
    if (!importedAgent.models) {
      importedAgent = {
        ...importedAgent,
        name: importedAgent.displayName || importedAgent.name || "Imported Agent",
        models: [
          {
            id: `${Date.now()}-model`,
            name: importedAgent.displayName || "Imported Model",
            modelId: importedAgent.modelName || "gpt-3.5-turbo",
            maxTokens: importedAgent.maxTokens,
          }
        ]
      };
    }

    const nextAgent: Agent = {
      ...importedAgent,
      id: Date.now().toString(),
    } as Agent;

    // Refresh model ids to avoid conflicts
    nextAgent.models = nextAgent.models.map(m => ({ ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));

    const nextAgents = [...agents, nextAgent];
    setAgents(nextAgents);
    setCurrentModelId(nextAgent.models[0]?.id || "");
    setEditingAgent(nextAgent);
  };

  return {
    agents,
    flattenedModels,
    currentModelId,
    setCurrentModelId,
    currentAgent,
    showSettings,
    setShowSettings,
    editingAgent,
    setEditingAgent,
    handleSaveAgent,
    handleDeleteAgent,
    handleExportAgent,
    handleImportAgents,
  };
}
