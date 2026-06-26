const manifest = {
    "editorOnly": true,
    "name": "To-Do",
    "description": "Record your project to-do!",
    "credits": [
        {
            "name": "KOSHINO",
            "link": "https://github.com/KOSHINOawa"
        },
        {
            "name": "RyaninCn11",
            "link": "https://github.com/RyaninCn11"
        }
    ],
    "tags": [
    "new", 
    "recommended",
    "astraeditor"
    ],
    "userscripts": [
        {
            "url": "userscript.js"
        }
    ],
    "userstyles": [
        {
            "url": "userstyle.css"
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
