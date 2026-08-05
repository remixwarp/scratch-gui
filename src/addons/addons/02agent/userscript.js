export default async function ({ addon, console }) {
  try {
    const DEFAULT_AGENT = {
      id: "hcnsec-default",
      name: "hcnsec",
      provider: "openai",
      baseUrl: "https://api.hcnsec.cn",
      apiKey: "sk-WP2blxGDtLWURyHA9CP4KzDbNt1OjtJi4GFe1UCg0TuIJ9rB",
      models: [
        {
          id: "hcnsec-default-model",
          name: "DeepSeek-V4-Flash",
          modelId: "DeepSeek-V4-Flash",
          maxTokens: 16384
        }
      ]
    };

    const AGENTS_KEY = "AI_ASSISTANT_AGENTS";
    const CURRENT_MODEL_KEY = "AI_ASSISTANT_CURRENT_AGENT_ID";
    const IMAGE_MODEL_KEY = "AI_ASSISTANT_IMAGE_MODEL_ID";

    const currentAgents = addon.settings ? null : null;

    const readLS = (key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    };

    const writeLS = (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    };

    const existingAgents = readLS(AGENTS_KEY);
    if (!existingAgents || !Array.isArray(existingAgents) || existingAgents.length === 0) {
      writeLS(AGENTS_KEY, [DEFAULT_AGENT]);
      writeLS(CURRENT_MODEL_KEY, "hcnsec-default-model");
      writeLS(IMAGE_MODEL_KEY, "");
      console.info("[02agent] Initialized default hcnsec agent (DeepSeek-V4-Flash).");
    }
  } catch (err) {
    console.warn("[02agent] userscript init failed:", err);
  }
}
