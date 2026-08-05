export default {
  name: "02agent",
  type: "component",
  description: "基于Gandi IDE AI assistant addon二次开发的AI助手，可以编写scratch代码",
  credits: [
    {
      name: "PPN-design",
      link: "https://github.com/ddguan2010/",
    },
    {
      name: "白猫@CCW",
      link: "https://www.ccw.site/student/6173f57f48cf8f4796fc860e",
    },
    {
      name: "酷可@CCW",
      link: "https://www.ccw.site/student/610b508176415b2f27e0f851",
    },
    {
      name: "笑小朗",
      link: "https://space.bilibili.com/3546876326447960",
    },
  ],
  settings: [
    {
      dynamic: true,
      id: "showButtonInEditor",
      name: "将按钮添加到编辑器右上角",
      default: true,
      type: "boolean",
    },
    {
      dynamic: true,
      id: "showButtonInToolsMenu",
      name: "将按钮添加到工具-AI菜单",
      default: true,
      type: "boolean",
    },
  ],
};
