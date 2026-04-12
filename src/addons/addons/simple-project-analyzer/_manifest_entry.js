export const manifest = {
  "name": "simple-project-analyzer/name",
  "displayName": "simple-project-analyzer/name",
  "description": "simple-project-analyzer/description",
  "version": "1.0.0",
  "author": "AstraEditor Team",
  "tags": ["project", "analysis", "statistics"],
  "contributors": ["AstraEditor Team"],
  "license": "MIT",
  "homepage": "https://github.com/AstraEditor/astraeditor-scratch-gui",
  "repository": {
    "type": "git",
    "url": "https://github.com/AstraEditor/astraeditor-scratch-gui.git"
  },
  "scripts": {
    "userscript": "userscript.js",
    "userstyle": "userstyle.css"
  },
  "l10n": {
    "defaultLocale": "en",
    "locales": ["en", "zh-cn"]
  },
  "permissions": [
    "vm",
    "tab",
    "storage"
  ],
  "dependencies": {
    "Chart.js": "^4.4.0"
  }
};

export const entry = "userscript.js";
export default manifest;