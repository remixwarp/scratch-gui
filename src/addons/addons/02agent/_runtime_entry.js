import _js from "./userscript.js";
import AIAssistant from "./index";
import React from "react";
import ReactDOM from "react-dom";

const PLUGINS_WRAPPER_SELECTOR = ".plugins-wrapper";
const GANDI_WRAPPER_SELECTOR = "#gandi-plugins-wrapper";
const MOUNT_CONTAINER_ID = "ai-assistant-mount";

function mountAIAssistant() {
  try {
    let pluginsWrapper = document.querySelector(PLUGINS_WRAPPER_SELECTOR) ||
      document.querySelector(GANDI_WRAPPER_SELECTOR);

    if (!pluginsWrapper) {
      pluginsWrapper = document.createElement("div");
      pluginsWrapper.className = "plugins-wrapper";
      pluginsWrapper.id = "gandi-plugins-wrapper";
      document.body.appendChild(pluginsWrapper);
    }

    let mountContainer = document.getElementById(MOUNT_CONTAINER_ID);

    if (!mountContainer) {
      mountContainer = document.createElement("div");
      mountContainer.id = MOUNT_CONTAINER_ID;
      document.body.appendChild(mountContainer);
    }

    if (mountContainer.dataset.aiAssistantMounted) {
      return;
    }
    mountContainer.dataset.aiAssistantMounted = "true";

    const vm = window.Scratch?.vm || null;
    const workspace = window.Scratch?.workspace || null;
    const blockly = window.Blockly || null;

    ReactDOM.render(
      React.createElement(AIAssistant, {
        vm,
        blockly,
        workspace,
        embedded: false,
        utils: {
          addCostumeToTarget: async () => [],
          deleteCostumeByTargetId: () => {},
          updateCostumeByTargetId: async () => {},
          getCostumeFromTarget: async () => null,
        },
      }),
      mountContainer
    );

    console.info("[02agent] AIAssistant component mounted.");
  } catch (err) {
    console.warn("[02agent] Failed to mount AIAssistant:", err);
  }
}

function waitAndMount(retries = 0) {
  const MAX_RETRIES = 40;
  const hasVM = !!(window.Scratch?.vm || window.vm);
  const hasBlockly = !!window.Blockly;

  if (hasVM && hasBlockly) {
    mountAIAssistant();
    return;
  }

  if (retries >= MAX_RETRIES) {
    console.warn("[02agent] VM/Blockly not ready after retries, attempting mount anyway.");
    mountAIAssistant();
    return;
  }

  setTimeout(() => waitAndMount(retries + 1), 500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => waitAndMount());
} else {
  waitAndMount();
}

export const resources = {
  "userscript.js": _js,
};
