import { useEffect, useState, useMemo } from "react";
import useStorageInfo from "../shims/hooks/useStorageInfo";
import { Agent, AgentModel, FlattenedAgent } from "../types";
import { PROVIDER_DEFAULT_URLS } from "../constants";

interface ExportedAgentFile {
  version: 1;
  exportedAt: string;
  agent: Agent;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "rw-default",
    name: "kat-coder-pro-v2.5",
    provider: "custom",
    baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
    apiKey: "sk-WP2blxGDtLWURyHA9CP4KzDbNt1OjtJi4GFe1UCg0TuIJ9rB",
    models: [
      {
        id: "rw-default-model",
        name: "kat-coder-pro-v2.5",
        modelId: "kat-coder-pro-v2.5",
      },
    ],
    locked: true,
  },
];

// 已被用户主动删除的 locked 内置 Agent ID 列表（持久化在 localStorage 中）
const REMOVED_LOCKED_AGENTS_KEY = "AI_ASSISTANT_REMOVED_LOCKED_AGENTS";
const readRemovedLockedAgentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(REMOVED_LOCKED_AGENTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
};
const writeRemovedLockedAgentIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(REMOVED_LOCKED_AGENTS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // 忽略写入失败
  }
};

const ensureDefaultAgent = (agents: Agent[]): Agent[] => {
  // 过滤掉 02agent 版本的内置 Agent，避免重复
  const filteredAgents = agents.filter((a) => a.id !== "default-free-chat");

  const lockedDefaults = new Map(DEFAULT_AGENTS.filter((a) => a.locked).map((a) => [a.id, a]));
  const presentLockedIds = new Set(filteredAgents.filter((a) => lockedDefaults.has(a.id)).map((a) => a.id));
  const removedLockedIds = readRemovedLockedAgentIds();

  // 对每个 locked 内置 agent：如果不在列表中且用户没主动删除过，则补齐到列表前面
  const missingLockedAgents = DEFAULT_AGENTS
    .filter((a) => a.locked && !presentLockedIds.has(a.id) && !removedLockedIds.has(a.id))
    .map((a) => ({ ...a, models: a.models.map((m) => ({ ...m })) }));

  if (missingLockedAgents.length > 0) {
    return [...missingLockedAgents, ...filteredAgents];
  }

  return filteredAgents.map((agent) => {
    const def = lockedDefaults.get(agent.id);
    if (!def) return agent;
    return {
      ...def,
      models: def.models,
      locked: def.locked,
    };
  });
};

export function useAgents() {
  const [agents, setAgents] = useStorageInfo<Agent[]>("AI_ASSISTANT_AGENTS", DEFAULT_AGENTS);
  const [currentModelId, setCurrentModelId] = useStorageInfo<string>("AI_ASSISTANT_CURRENT_AGENT_ID", "rw-default-model");
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

      return models.map((model) => ({
        id: model.id,
        agentId: agent.id,
        provider: agent.provider,
        baseUrl: agent.baseUrl,
        apiKey: agent.apiKey,
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
    const enforcedAgents = ensureDefaultAgent(agents);
    const needsRefresh = JSON.stringify(enforcedAgents) !== JSON.stringify(agents);
    if (needsRefresh) {
      setAgents(enforcedAgents);
      return;
    }

    if (!agents.length) {
      setAgents(DEFAULT_AGENTS);
      setCurrentModelId(DEFAULT_AGENTS[0].models[0].id);
      return;
    }

    if (!flattenedModels.some((model) => model.id === currentModelId)) {
      const defaultModel = flattenedModels.find((m) => m.id === DEFAULT_AGENTS[0].models[0].id);
      setCurrentModelId(defaultModel?.id || flattenedModels[0]?.id || "");
    }
  }, [agents, currentModelId, setAgents, setCurrentModelId, flattenedModels]);

  const handleSaveAgent = (newAgent: Agent) => {
    if (editingAgent?.locked) {
      setEditingAgent(null);
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
    if (agents.length <= 1) {
      window.alert("至少保留一个 Agent");
      return;
    }

    // 如果删除的是 locked 内置 Agent，记录到已删除列表，避免下次启动时自动补回
    const deletedAgent = agents.find((a) => a.id === id);
    if (deletedAgent?.locked) {
      const removedIds = readRemovedLockedAgentIds();
      removedIds.add(id);
      writeRemovedLockedAgentIds(removedIds);
    }

    const nextAgents = agents.filter((agent) => agent.id !== id);
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
    if (agent.locked) {
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
      throw new Error("导入失败:文件内容不是有效的 Agent 配置");
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
