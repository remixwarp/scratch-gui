import React from 'react';
import ReactDOM from 'react-dom';
import Agent from './index.tsx';
const AgentHost = ({
  addonApi
}) => {
  const addon = addonApi.addon;
  const vm = addon.tab.traps.vm;
  const [workspace, setWorkspace] = React.useState(() => addon.tab.traps.getWorkspace() || null);
  const getEditorThemeMode = React.useCallback(() => {
    const reduxState = addon.tab.redux?.state;
    if (reduxState) {
      const theme = reduxState.scratchGui?.theme?.theme;
      if (typeof theme?.isDark === 'function') {
        return theme.isDark() ? 'dark' : 'light';
      }
      const isDark = reduxState.scratchGui?.theme?.isDark;
      if (typeof isDark === 'boolean') {
        return isDark ? 'dark' : 'light';
      }
    }
    const bodyClass = document.body.className;
    if (bodyClass.includes('dark') || bodyClass.includes('Dark')) {
      return 'dark';
    }
    const themeStyle = getComputedStyle(document.documentElement).getPropertyValue('--theme');
    if (themeStyle.includes('dark')) {
      return 'dark';
    }
    return 'light';
  }, [addon]);
  const [editorThemeMode, setEditorThemeMode] = React.useState(getEditorThemeMode);
  const [showButtonInEditor, setShowButtonInEditor] = React.useState(() => addon.settings.get('showButtonInEditor'));
  React.useEffect(() => {
    let disposed = false;
    addon.tab.traps.getBlockly().then(ScratchBlocks => {
      if (disposed) return;
      if (!window.Blockly) {
        window.Blockly = ScratchBlocks;
      }
      if (!window.ScratchBlocks) {
        window.ScratchBlocks = ScratchBlocks;
      }
      setWorkspace(addon.tab.traps.getWorkspace() || ScratchBlocks.getMainWorkspace?.() || null);
    }).catch(error => {
      console.error('[02Agent] Failed to initialize Blockly hooks', error);
    });
    return () => {
      disposed = true;
    };
  }, [addon]);
  React.useEffect(() => {
    const redux = addon.tab.redux;
    if (!redux) return undefined;
    redux.initialize?.();
    const handleStateChanged = () => setEditorThemeMode(getEditorThemeMode());
    redux.addEventListener?.('statechanged', handleStateChanged);
    handleStateChanged();
    return () => redux.removeEventListener?.('statechanged', handleStateChanged);
  }, [addon, getEditorThemeMode]);
  React.useEffect(() => {
    const handleSettingsChange = () => {
      setShowButtonInEditor(addon.settings.get('showButtonInEditor'));
    };
    addon.settings.addEventListener('change', handleSettingsChange);
    return () => addon.settings.removeEventListener('change', handleSettingsChange);
  }, [addon]);
  return /*#__PURE__*/React.createElement(Agent, {
    vm: vm,
    workspace: workspace,
    editorThemeMode: editorThemeMode,
    showButtonInEditor: showButtonInEditor
  });
};
export default addonApi => {
  const addon = addonApi.addon;
  const vm = addon.tab.traps.vm;
  if (!vm) {
    console.warn('[02Agent] VM is not ready, skipping mount');
    return;
  }
  const existing = document.querySelector('[data-sa-id="addon-02agent"]');
  if (existing) {
    ReactDOM.unmountComponentAtNode(existing);
    existing.remove();
  }
  const host = document.createElement('div');
  host.id = 'gandi-plugins-wrapper';
  host.dataset.saId = 'addon-02agent';
  Object.assign(host.style, {
    position: 'fixed',
    right: '16px',
    top: '48px',
    zIndex: 2147483647,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none'
  });
  document.body.appendChild(host);
  ReactDOM.render(/*#__PURE__*/React.createElement(AgentHost, {
    addonApi: addonApi
  }), host);
  addon.self.addEventListener('disabled', () => {
    ReactDOM.unmountComponentAtNode(host);
    host.remove();
  });
};
