const manifest = {
  "editorOnly": true,
  "name": "Simple Project Analyzer",
  "description": "Analyses your Scratch project and shows detailed statistics including Dr.Scratch scoring, block distribution and more.",
  "credits": [
    {
      name: "Cyberexplorer",
      link: "https://github.com/LanwyWriteXU"
    },
    {
      name: "KOSHINO",
      link: "https://github.com/KOSHINOawa"
    },
    {
      name: "RyaninCn11",
      link: "https://github.com/RyaninCn11"
    }
  ],
  "tags": [
    "recommended",
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
  "enabledByDefault": true
};
export default manifest;