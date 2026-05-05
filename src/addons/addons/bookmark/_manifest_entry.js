const manifest = {
  "editorOnly": true,
  "name": "Bookmark",
  "description": "Add bookmarks to your project to quickly navigate between different parts of your code",
  "credits": [
    {
      name: "AstraEditor Team",
      link: "https://github.com/AstraEditor"
    }
  ],
  "tags": [
    "navigation",
    "productivity",
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
