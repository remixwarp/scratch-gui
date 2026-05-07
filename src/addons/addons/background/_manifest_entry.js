const manifest = {
  "name": "background/name",
  "description": "background/description",
  "editorOnly": false,
  "tags": [
    "editor",
    "new",
    "astraeditor"
  ],
  "info": [
    {
      "type": "notice",
      "text": "background/performance-warning",
      "id": "reducePerformance"
    }
  ],
  "credits": [
    {
      "name": "KOSHINO",
      "link": "https://github.com/KOSHINOawa"
    }
  ],
  "userscripts": [
    {
      "url": "userscript.js"
    }
  ],
  "userstyles": [
    {
      "url": "style.css"
    }
  ],
  "l10n": {
    "defaultLocale": "en",
    "locales": ["en", "zh-cn"]
  },
  "permissions": [
    "tab"
  ]
};
export default manifest;