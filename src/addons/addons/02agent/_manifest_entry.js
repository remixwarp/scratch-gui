const manifest = {
  editorOnly: true,
  name: "02agent",
  description: "AI 助手（基于 gandi-plugins）",
  credits: [
    {
      name: "little-starts"
    }
  ],
  dynamicDisable: false,
  userscripts: [
    {
      url: "userscript.js"
    }
  ],
  tags: ["ai", "02engine"],
  enabledByDefault: false
};
export default manifest;
