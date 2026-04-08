export default {
  "name": "VS Code 注释同步",
  "description": "在 Scratch 编辑器和 VS Code 之间同步注释",
  "credits": [{ "name": "02Engine", "link": "" }],
  "tags": ["editor", "comments"],
  "enabledByDefault": true,
  "userscripts": [
    {
      "url": "userscript.js",
      "matches": ["projects"]
    }
  ],
  "userstyles": [
    {
      "url": "userstyle.css",
      "matches": ["projects"]
    }
  ]
};
