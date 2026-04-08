const manifest = {
  editorOnly: true,
  name: "代码风格",
  description: "极简主义积木风格：仅彩色文本，无可见边框，输入框采用括号风格",
  credits: [
    {
      name: "02engine"
    }
  ],
  dynamicDisable: true,
  userscripts: [
    {
      url: "userscript.js"
    }
  ],
  userstyles: [
    {
      url: "coder-style.css"
    }
  ],
  settings: [
    {
      dynamic: true,
      name: "积木透明度",
      id: "block-opacity",
      type: "number",
      default: 0.02,
      min: 0.01,
      max: 0.1,
      step: 0.01
    },
    {
      dynamic: true,
      name: "C形积木透明度",
      id: "c-shape-opacity",
      type: "number",
      default: 0.08,
      min: 0.01,
      max: 0.2,
      step: 0.01
    },
    {
      dynamic: true,
      name: "布尔积木透明度",
      id: "boolean-opacity",
      type: "number",
      default: 0.15,
      min: 0.05,
      max: 0.3,
      step: 0.01
    },
    {
      dynamic: true,
      name: "输入积木透明度",
      id: "input-opacity",
      type: "number",
      default: 0.12,
      min: 0.05,
      max: 0.3,
      step: 0.01
    }
  ],
  tags: ["theme", "blocks"],
  enabledByDefault: false
};
export default manifest;