import * as React from "react";
import ReactDOM from "react-dom";
import styles from "../ui/SettingsNew.module.less";
import themeStyles from "../ui/Theme.module.less";
import { Agent, AgentModel } from "../types";
import { PROVIDER_DEFAULT_URLS } from "../constants";
import { Bot, Info } from "lucide-react";

type SettingsSection = "agents" | "about";

interface SettingsWindowProps {
  agents: Agent[];
  editingAgent: Agent | null;
  onSaveAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onExportAgent: (id: string) => void;
  onImportAgent: (file: File) => Promise<void>;
  onEditAgent: (agent: Agent | null) => void;
  onClose: () => void;
  msg: (key: string, params?: Record<string, string | number>) => string;
}

const PROVIDER_LABELS: Record<Agent["provider"], string> = {
  openai: "OpenAI",
  zhipu: "智谱清言",
  deepseek: "DeepSeek",
  anthropic: "Anthropic",
  google: "Google",
  azure: "Azure",
  custom: "自定义 OpenAI",
  custom_anthropic: "自定义 Anthropic",
};

const createDefaultModel = (): AgentModel => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "My GPT-4o",
  modelId: "gpt-4o",
});

const getDefaultModelForProvider = (provider: Agent["provider"]) => {
  if (provider === "zhipu") return { name: "GLM-4", modelId: "glm-4" };
  if (provider === "deepseek") return { name: "DeepSeek Chat", modelId: "deepseek-chat" };
  if (provider === "anthropic" || provider === "custom_anthropic") {
    return { name: "Claude 3.5 Sonnet", modelId: "claude-3-5-sonnet-latest" };
  }
  return { name: "GPT-4o", modelId: "gpt-4o" };
};

interface FetchedModel {
  id: string;
  name: string;
}

const normalizeModelsUrl = (baseUrl: string) => {
  const normalized = baseUrl.trim().replace(/\/$/, "");
  if (!normalized) return "";
  if (normalized.endsWith("/models")) return normalized;
  if (normalized.endsWith("/chat/completions")) return normalized.slice(0, -"/chat/completions".length) + "/models";
  return `${normalized}/models`;
};

const getModelDisplayName = (model: Record<string, unknown>) => {
  const value = model.display_name || model.displayName || model.name || model.id;
  return typeof value === "string" ? value : "";
};

const parseModelResponse = (payload: unknown): FetchedModel[] => {
  const candidate = payload as Record<string, unknown>;
  const rawModels = Array.isArray(candidate?.data)
    ? candidate.data
    : Array.isArray(candidate?.models)
      ? candidate.models
      : Array.isArray(payload)
        ? payload
        : [];

  return rawModels
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const model = item as Record<string, unknown>;
      const idValue = model.id || model.name;
      if (typeof idValue !== "string" || !idValue.trim()) return null;
      return {
        id: idValue,
        name: getModelDisplayName(model) || idValue,
      };
    })
    .filter((item): item is FetchedModel => Boolean(item));
};

const fetchProviderModels = async (provider: Agent["provider"], baseUrl: string, apiKey: string, signal?: AbortSignal) => {
  const url = normalizeModelsUrl(baseUrl || PROVIDER_DEFAULT_URLS[provider] || "");
  if (!url) throw new Error("请先填写 Base URL");
  if (!apiKey.trim()) throw new Error("请先填写 API Key");

  const headers: Record<string, string> = {};
  if (provider === "anthropic" || provider === "custom_anthropic") {
    headers["x-api-key"] = apiKey.trim();
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  } else {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  try {
    const response = await fetch(url, { headers, signal });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`获取模型列表失败:${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`);
    }

    const models = parseModelResponse(await response.json());
    if (models.length === 0) throw new Error("接口没有返回可用模型");
    return models;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to read the 'headers' property")) {
      throw new Error("API Key 包含非法字符，请检查输入");
    }
    throw error;
  }
};

const Header: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.header}>
    {children}
    <div className={styles.divider} />
  </div>
);

interface SidebarItemProps {
  id: string;
  label: string;
  icon: React.ElementType;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, label, icon: Icon, isSelected, onClick }) => (
  <div
    className={`${styles.sidebarItem} ${isSelected ? styles.selected : ""}`}
    onClick={() => onClick(id)}
    title={label}
  >
    {Icon && <Icon className={styles.sidebarIcon} />}
    <span className={styles.sidebarLabel}>{label}</span>
  </div>
);

const AgentsSettings: React.FC<{
  agents: Agent[];
  editingAgent: Agent | null;
  onSaveAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onExportAgent: (id: string) => void;
  onImportAgent: (file: File) => Promise<void>;
  onEditAgent: (agent: Agent | null) => void;
  msg: (key: string, params?: Record<string, string | number>) => string;
}> = ({ agents, editingAgent, onSaveAgent, onDeleteAgent, onExportAgent, onImportAgent, onEditAgent, msg }) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = React.useState<Partial<Agent>>({ provider: "openai" });
  const [models, setModels] = React.useState<AgentModel[]>([createDefaultModel()]);
  const [fetchedModels, setFetchedModels] = React.useState<FetchedModel[]>([]);
  const [selectedFetchedModelId, setSelectedFetchedModelId] = React.useState("");
  const [isFetchingModels, setIsFetchingModels] = React.useState(false);
  const [modelFetchMessage, setModelFetchMessage] = React.useState("");

  React.useEffect(() => {
    if (editingAgent) {
      setFormData({
        provider: editingAgent.provider,
        name: editingAgent.name || (editingAgent as any).displayName || "",
        baseUrl: editingAgent.baseUrl,
        apiKey: editingAgent.apiKey,
      });
      setModels(
        editingAgent.models || [
          {
            id: `${editingAgent.id}-model`,
            name: (editingAgent as any).displayName || "Default Model",
            modelId: (editingAgent as any).modelName || "gpt-3.5-turbo",
            maxTokens: (editingAgent as any).maxTokens,
          },
        ],
      );
      return;
    }

    setFormData({ provider: "openai", baseUrl: PROVIDER_DEFAULT_URLS.openai });
    setModels([createDefaultModel()]);
  }, [editingAgent]);

  const handleFetchModels = React.useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      const provider = formData.provider || "openai";
      const baseUrl = formData.baseUrl?.trim() || PROVIDER_DEFAULT_URLS[provider] || "";
      const apiKey = formData.apiKey || "";

      if (!apiKey.trim()) {
        if (!options?.silent) setModelFetchMessage(msg("model-hint"));
        return;
      }

      setIsFetchingModels(true);
      if (!options?.silent) setModelFetchMessage(msg("model-fetching"));

      try {
        const nextModels = await fetchProviderModels(provider, baseUrl, apiKey, options?.signal);
        setFetchedModels(nextModels);
        setSelectedFetchedModelId((previous) => previous || nextModels[0]?.id || "");
        setModelFetchMessage(msg("model-fetch-success", { count: nextModels.length }));
      } catch (error) {
        if (options?.signal?.aborted) return;
        setFetchedModels([]);
        setSelectedFetchedModelId("");
        setModelFetchMessage(error instanceof Error ? error.message : msg("model-fetch-fail"));
      } finally {
        if (!options?.signal?.aborted) setIsFetchingModels(false);
      }
    },
    [formData.apiKey, formData.baseUrl, formData.provider],
  );

  React.useEffect(() => {
    setFetchedModels([]);
    setSelectedFetchedModelId("");
    setModelFetchMessage("");
  }, [formData.provider, formData.baseUrl]);

  React.useEffect(() => {
    if (!formData.apiKey?.trim()) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void handleFetchModels({ silent: true, signal: controller.signal });
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [formData.apiKey, formData.baseUrl, formData.provider, handleFetchModels]);

  const handleProviderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = event.target.value as Agent["provider"];
    const defaults = getDefaultModelForProvider(provider);
    const baseUrl = PROVIDER_DEFAULT_URLS[provider] || "";
    setFormData((previous) => ({ ...previous, provider, baseUrl }));

    if (models.length === 1) {
      setModels([{ ...models[0], ...defaults }]);
    }
  };

  const updateModel = (id: string, field: keyof AgentModel, value: string | number | undefined) => {
    setModels((previous) => previous.map((model) => (model.id === id ? { ...model, [field]: value } : model)));
  };

  const removeModel = (id: string) => {
    setModels((previous) => previous.filter((model) => model.id !== id));
  };

  const addModel = () => {
    setModels((previous) => [...previous, createDefaultModel()]);
  };

  const addFetchedModel = () => {
    const selected = fetchedModels.find((model) => model.id === selectedFetchedModelId);
    if (!selected) return;

    setModels((previous) => {
      if (previous.some((model) => model.modelId === selected.id)) return previous;
      return [
        ...previous,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: selected.name || selected.id,
          modelId: selected.id,
        },
      ];
    });
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const provider = formData.provider || "openai";
    const validModels = models.filter((model) => model.name.trim() && model.modelId.trim());

    if (validModels.length === 0) {
      window.alert(msg("at-least-one-model"));
      return;
    }

    onSaveAgent({
      id: editingAgent?.id || `${Date.now()}`,
      provider,
      baseUrl: formData.baseUrl?.trim() || PROVIDER_DEFAULT_URLS[provider] || "",
      apiKey: formData.apiKey || "",
      name: formData.name?.trim() || PROVIDER_LABELS[provider] || "Custom Agent",
      models: validModels,
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await onImportAgent(file);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : msg("import-fail"));
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className={styles.body}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h5>{editingAgent ? msg("edit-agent") : msg("add-agent")}</h5>
            <p>{msg("agent-description")}</p>
          </div>
        </div>
        <form className={styles.cardBody} onSubmit={handleSave}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.label}>{msg("field-name")}</span>
              <input
                className={styles.input}
                value={formData.name || ""}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder={msg("placeholder-agent-name")}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{msg("field-provider")}</span>
              <select
                className={styles.select}
                value={formData.provider || "openai"}
                onChange={handleProviderChange}
              >
                <option value="openai">{msg("provider-openai")}</option>
                <option value="zhipu">{msg("provider-zhipu")}</option>
                <option value="anthropic">{msg("provider-anthropic")}</option>
                <option value="deepseek">{msg("provider-deepseek")}</option>
                <option value="custom">{msg("provider-custom")}</option>
                <option value="custom_anthropic">{msg("provider-custom-anthropic")}</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Base URL</span>
              <input
                className={styles.input}
                value={formData.baseUrl || ""}
                onChange={(event) => setFormData({ ...formData, baseUrl: event.target.value })}
                placeholder={msg("placeholder-base-url")}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>API Key</span>
              <input
                className={styles.input}
                type="password"
                value={formData.apiKey || ""}
                onChange={(event) => setFormData({ ...formData, apiKey: event.target.value })}
                placeholder="sk-..."
              />
            </label>
          </div>

          <div className={styles.cardHeader} style={{ marginTop: "1rem" }}>
            <div>
              <h5>{msg("models-list")}</h5>
              <p>{msg("models-list-description")}</p>
            </div>
            <button type="button" className={styles.button} onClick={addModel}>
              {msg("add-model")}
            </button>
          </div>
          <div className={styles.modelFetchPanel}>
            <div className={styles.modelFetchControls}>
              <select
                className={styles.select}
                value={selectedFetchedModelId}
                onChange={(event) => setSelectedFetchedModelId(event.target.value)}
                disabled={fetchedModels.length === 0}
              >
                {fetchedModels.length === 0 ? <option value="">{msg("no-models-available")}</option> : null}
                {fetchedModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name === model.id ? model.id : `${model.name} (${model.id})`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.button}
                onClick={() => void handleFetchModels()}
                disabled={isFetchingModels}
              >
                {isFetchingModels ? msg("fetching") : msg("refresh-models")}
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={addFetchedModel}
                disabled={!selectedFetchedModelId}
              >
                {msg("add-selected")}
              </button>
            </div>
            <div className={styles.hint}>
              {modelFetchMessage || msg("model-fetch-hint")}
            </div>
            <datalist id="nova-fetched-models">
              {fetchedModels.map((model) => (
                <option key={model.id} value={model.id} label={model.name} />
              ))}
            </datalist>
          </div>
          <div className={styles.modelsTable}>
            {models.map((model) => (
              <div key={model.id} className={styles.modelRow}>
                <input
                  className={styles.input}
                  value={model.name}
                  onChange={(event) => updateModel(model.id, "name", event.target.value)}
                  placeholder={msg("placeholder-model-name")}
                  required
                />
                <input
                  className={styles.input}
                  list="nova-fetched-models"
                  value={model.modelId}
                  onChange={(event) => updateModel(model.id, "modelId", event.target.value)}
                  placeholder={msg("placeholder-model-id")}
                  required
                />
                <input
                  className={styles.input}
                  type="number"
                  min={2048}
                  max={1000000}
                  value={model.maxTokens || ""}
                  onChange={(event) =>
                    updateModel(
                      model.id,
                      "maxTokens",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  placeholder="Max Tokens"
                />
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => removeModel(model.id)}
                  disabled={models.length <= 1}
                >
                  {msg("delete")}
                </button>
              </div>
            ))}
          </div>

          <div className={`${styles.toolbar} ${styles.formActions}`}>
            <div className={styles.hint}>{msg("config-stored-locally")}</div>
            <div className={styles.actions}>
              {editingAgent ? (
                <button type="button" className={styles.button} onClick={() => onEditAgent(null)}>
                  {msg("cancel-edit")}
                </button>
              ) : null}
              <button type="submit" className={styles.primaryButton}>
                {editingAgent ? msg("save-changes") : msg("add-agent")}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h5>{msg("configured-agents")}</h5>
            <p>{msg("configured-agents-description")}</p>
          </div>
          <button type="button" className={styles.button} onClick={() => fileInputRef.current?.click()}>
            {msg("import-agent")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.fileInput}
            onChange={(event) => void handleImport(event)}
          />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.agentList}>
            {agents.map((agent) => (
              <article key={agent.id} className={styles.agentItem}>
                <div className={styles.agentItemHeader}>
                  <div>
                    <div className={styles.agentName}>{agent.name || (agent as any).displayName}</div>
                    <div className={styles.agentProvider}>
                      {PROVIDER_LABELS[agent.provider] || agent.provider}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.button} onClick={() => onEditAgent(agent)}>
                      {msg("edit")}
                    </button>
                    <button type="button" className={styles.button} onClick={() => onExportAgent(agent.id)}>
                      {msg("export")}
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      onClick={() => onDeleteAgent(agent.id)}
                    >
                      {msg("delete")}
                    </button>
                  </div>
                </div>
                <div className={styles.modelList}>
                  {(agent.models || []).map((model) => (
                    <div key={model.id} className={styles.modelItem}>
                      <strong>{model.name}</strong>
                      <span>
                        {model.modelId}
                        {model.maxTokens ? ` · ${model.maxTokens}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AboutSettings: React.FC<{ msg: (key: string) => string }> = ({ msg }) => (
  <div className={styles.body}>
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h5>{msg("ui-architecture")}</h5>
          <p>{msg("ui-architecture-description")}</p>
        </div>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.hint}>
          {msg("ui-architecture-hint")}
        </p>
        <br/>
        <p className={styles.hint}>
          {msg("im-not-amazon")}
        </p>
      </div>
    </div>
  </div>
);

const SettingsContent: React.FC<SettingsWindowProps> = ({ msg, ...props }) => {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("agents");
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== "undefined") {
      const style = document.documentElement.style;
      const colorScheme = style.getPropertyValue('--color-scheme') || getComputedStyle(document.documentElement).getPropertyValue('--color-scheme');
      if (colorScheme === 'dark') return true;
      if (colorScheme === 'light') return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // 监听主题变化 - 通过监听 documentElement 的 style 变化
  React.useEffect(() => {
    const checkTheme = () => {
      const style = document.documentElement.style;
      const colorScheme = style.getPropertyValue('--color-scheme') || getComputedStyle(document.documentElement).getPropertyValue('--color-scheme');
      setIsDark(colorScheme === 'dark');
    };

    // 使用 MutationObserver 监听 documentElement 的属性变化
    const observer = new MutationObserver(() => {
      checkTheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

    // 也监听 class 变化(以防万一)
    const bodyObserver = new MutationObserver(() => {
      checkTheme();
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // 定期检查(作为备份)
    const interval = setInterval(checkTheme, 500);

    return () => {
      observer.disconnect();
      bodyObserver.disconnect();
      clearInterval(interval);
    };
  }, []);

  const categories = [
    { id: "agents" as const, label: msg("models"), icon: Bot },
    { id: "about" as const, label: msg("about"), icon: Info },
  ];

  return (
    <div className={`${styles.settingsContainer} ${isDark ? themeStyles.themeDark : themeStyles.themeLight}`}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarItems}>
          {categories.map((cat) => (
            <SidebarItem
              key={cat.id}
              id={cat.id}
              label={cat.label}
              icon={cat.icon}
              isSelected={activeSection === cat.id}
              onClick={(id) => setActiveSection(id as SettingsSection)}
            />
          ))}
        </div>
      </div>
      <div className={styles.contentArea}>
        {activeSection === "agents" && (
          <AgentsSettings
            agents={props.agents}
            editingAgent={props.editingAgent}
            onSaveAgent={props.onSaveAgent}
            onDeleteAgent={props.onDeleteAgent}
            onExportAgent={props.onExportAgent}
            onImportAgent={props.onImportAgent}
            onEditAgent={props.onEditAgent}
            msg={msg}
          />
        )}
        {activeSection === "about" && <AboutSettings msg={msg} />}
      </div>
    </div>
  );
};

let settingsWindow: any = null;
let settingsContentRef: HTMLDivElement | null = null;
let currentProps: SettingsWindowProps | null = null;

export const createSettingsWindow = async (props: SettingsWindowProps) => {
  currentProps = props;

  if (settingsWindow && settingsWindow.isVisible) {
    // 窗口已存在，更新 props 并重新渲染
    if (settingsContentRef) {
      ReactDOM.render(<SettingsContent {...props} />, settingsContentRef);
    }
    settingsWindow.show().bringToFront();
    return;
  }

  const windowManagerModule = await import("../../../window-system/window-manager.js");
  const WindowManager = windowManagerModule.default;

  const initialX = Math.max(24, Math.min(window.innerWidth - 824, 150));
  const initialY = Math.max(24, Math.min(window.innerHeight - 624, 100));

  settingsContentRef = document.createElement("div");
  settingsContentRef.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    overflow: hidden;
  `;

  settingsWindow = WindowManager.createWindow({
    id: "nova-settings",
    title: props.msg ? props.msg("settings-title") : "Bilup Nova Settings",
    width: 780,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    maxWidth: Math.min(window.innerWidth * 0.9, 1000),
    maxHeight: Math.min(window.innerHeight * 0.9, 800),
    className: "sa-nova-settings-window",
    x: initialX,
    y: initialY,
    onClose: () => {
      if (settingsContentRef) {
        ReactDOM.unmountComponentAtNode(settingsContentRef);
        settingsContentRef = null;
      }
      settingsWindow = null;
      currentProps = null;
      props.onClose();
    },
  });

  ReactDOM.render(<SettingsContent {...props} />, settingsContentRef);
  settingsWindow.setContent(settingsContentRef);
  settingsWindow.show();
};

export const updateSettingsWindow = (props: Partial<SettingsWindowProps>) => {
  if (settingsWindow && settingsContentRef && currentProps) {
    const newProps = { ...currentProps, ...props };
    currentProps = newProps;
    ReactDOM.render(<SettingsContent {...newProps} />, settingsContentRef);
  }
};

export const closeSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.close();
    settingsWindow = null;
  }
};