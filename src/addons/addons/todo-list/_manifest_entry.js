const manifest = {
  "editorOnly": true,
  "name": "Todo List",
  "description": "Adds a todo list feature to the Scratch editor",
  "credits": [
    {
      name: "AstraEditor Team",
      link: "https://github.com/AstraEditor"
    }
  ],
  "tags": [
    "productivity",
    "new",
    "astraeditor"
  ],
  "dynamicDisable": true,
  "userscripts": [
    {
      url: "userscript.js"
    }
  ],
  "userstyles": [
    {
      url: "userstyle.css"
    }
  ],
  "enabledByDefault": true,
  "l10n": {
    "defaultLocale": "en",
    "locales": ["en", "zh-cn"]
  },
  "permissions": [
    "vm",
    "tab",
    "storage"
  ]
};
export default manifest;
