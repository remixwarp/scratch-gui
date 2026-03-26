// Name: ningqiSensings
// ID: ningqiSensings
// Description: Check for some things that may not be part of the scratchwork
// By: ningqi <https://github.com/ningqi24>
// License: CC-BY-4.0

Scratch.translate.setup({
    "zh-cn": {
        "_Sensings": "ningqi的检测",
        "_Packaged Detection": "打包检测",
        "_is packaged?": "是打包作品吗？",
        "_is key pressed?": "按下 [KEY] 吗？",
        "_is editor name equal?": "编辑器名称等于 [NAME] 吗？",
        "_editor name":"编辑器名称",
        "_get timezone": "获取当前时区",
        "_get screen width": "获取屏幕宽度",
        "_get screen height": "获取屏幕高度",
        "_read from clipboard": "从剪贴板读取文本",
        "_browser": "浏览器名称",
        "_dark": "暗色",
        "_device memory in GB": "设备运行内存",
        "_light": "亮色",
        "_operating system": "操作系统名称",
        "_user prefers [THEME] color scheme?": "开启了[THEME]主题？",
        "_user prefers more contrast?": "开启了高对比度？",
        "_user prefers reduced motion?": "开启了动画减弱功能？",
        "_is mouse button pressed?": "按下 [BUTTON] 吗？",
        "_mouse_left": "左键",
        "_mouse_middle": "中键",
        "_mouse_right": "右键",
        "_editor_type_text": "文本框",
    },
    "en": {
        "_Sensings": "ningqi's Sensings",
        "_Packaged Detection": "Packaged Detection",
        "_is packaged?": "is packaged?",
        "_is key pressed?": "is [KEY] pressed?",
        "_editor name":"editor name",
        "_is editor name equal?": "is editor name equal to [NAME]?",
        "_get timezone": "get current timezone",
        "_get screen width": "get screen width",
        "_get screen height": "get screen height",
        "_read from clipboard": "read from clipboard",
        "_browser": "Browser Name",
        "_dark": "Dark",
        "_device memory in GB": "Device Memory (GB)",
        "_light": "Light",
        "_operating system": "Operating System",
        "_user prefers [THEME] color scheme?": "Does user prefer [THEME] color scheme?",
        "_user prefers more contrast?": "Does user prefer more contrast?",
        "_user prefers reduced motion?": "Does user prefer reduced motion?",
        "_is mouse button pressed?": "is [BUTTON] pressed?",
        "_mouse_left": "left",
        "_mouse_middle": "middle",
        "_mouse_right": "right",
        "_editor_type_text": "text input",
    },
    "zh-tw": {
        "_Sensings": " ningqi的檢測",
        "_Packaged Detection": "打包檢測",
        "_is packaged?": "是打包作品嗎？",
        "_is key pressed?": "按下 [KEY] 嗎？",
        "_editor name":"編輯者名稱",
        "_is editor name equal?": "編輯器名稱是否等於 [NAME]？",
        "_get timezone": "獲取當前時區",
        "_get screen width": "獲取螢幕寬度",
        "_get screen height": "獲取螢幕高度",
        "_read from clipboard": "從剪貼板讀取文本",
        "_browser": "瀏覽器名稱",
        "_dark": "暗色",
        "_device memory in GB": "設備運行記憶體",
        "_light": "亮色",
        "_operating system": "作業系統名稱",
        "_user prefers [THEME] color scheme?": "開啟了[THEME]主題？",
        "_user prefers more contrast?": "開啟了高對比度？",
        "_user prefers reduced motion?": "開啟了動畫減弱功能？",
        "_is mouse button pressed?": "按下 [BUTTON] 嗎？",
        "_mouse_left": "左鍵",
        "_mouse_middle": "中鍵",
        "_mouse_right": "右鍵",
        "_editor_type_text": "文字輸入框",
    }
});

(function(Scratch) {
    'use strict';

    let pressedKeys = {};
    let pressedMouseButtons = {};
    let currentMouseButton = -1;
    let lastPressedKey = ''; 

    window.addEventListener('keydown', (event) => {
        pressedKeys[event.key.toLowerCase()] = true;
        lastPressedKey = event.key;
    });

    window.addEventListener('keyup', (event) => {
        pressedKeys[event.key.toLowerCase()] = false;
    });

    window.addEventListener('mousedown', (event) => {
        pressedMouseButtons[event.button] = true;
        currentMouseButton = event.button;
    });

    window.addEventListener('mouseup', (event) => {
        pressedMouseButtons[event.button] = false;
    });

    class PackagedDetection {
        getInfo() {
            return {
                id: 'ningqiSensings',
                name: Scratch.translate('Sensings'),
                menuIconURI: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgdmVyc2lvbj0iMS4xIgogICB3aWR0aD0iMzguMDExNzgiCiAgIGhlaWdodD0iMzguMDAwMDE1IgogICB2aWV3Qm94PSIwIDAgMzguMDExNzc5IDM4LjAwMDAxNiIKICAgaWQ9InN2ZzkiCiAgIHNvZGlwb2RpOmRvY25hbWU9Im5pbmdxaVNlbnNpbmdzTG9nby5zdmciCiAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuNC4yIChmNDMyN2Y0LCAyMDI1LTA1LTEzKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9Im5hbWVkdmlldzkiCiAgICAgcGFnZWNvbG9yPSIjNTA1MDUwIgogICAgIGJvcmRlcmNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcm9wYWNpdHk9IjEiCiAgICAgaW5rc2NhcGU6c2hvd3BhZ2VzaGFkb3c9IjAiCiAgICAgaW5rc2NhcGU6cGFnZW9wYWNpdHk9IjAiCiAgICAgaW5rc2NhcGU6cGFnZWNoZWNrZXJib2FyZD0iMSIKICAgICBpbmtzY2FwZTpkZXNrY29sb3I9IiM1MDUwNTAiCiAgICAgaW5rc2NhcGU6em9vbT0iMC43OCIKICAgICBpbmtzY2FwZTpjeD0iNTUyLjU2NDEiCiAgICAgaW5rc2NhcGU6Y3k9IjI2Ni4wMjU2NCIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjEzNjYiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iNzA1IgogICAgIGlua3NjYXBlOndpbmRvdy14PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJzdmc5Ij48aW5rc2NhcGU6cGFnZQogICAgICAgeD0iMCIKICAgICAgIHk9IjAiCiAgICAgICB3aWR0aD0iMzguMDExNzgiCiAgICAgICBoZWlnaHQ9IjM4LjAwMDAxNSIKICAgICAgIGlkPSJwYWdlMSIKICAgICAgIG1hcmdpbj0iMCIKICAgICAgIGJsZWVkPSIwIiAvPjwvc29kaXBvZGk6bmFtZWR2aWV3PjxkZWZzCiAgICAgaWQ9ImRlZnMyIiAvPjxnCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC4wODk5OTM5NywwLDAsMC4wOTMwODM4NiwtNzEuNjAwMTgzLC0xMy42MDc0ODIpIgogICAgIGlkPSJnOSI+PGcKICAgICAgIHN0cm9rZT0ibm9uZSIKICAgICAgIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIKICAgICAgIGlkPSJnOCI+PHBhdGgKICAgICAgICAgZD0ibSAxMjAzLjg2ODYsMzUwLjMwMjI5IGMgMCwxMzYuMDczMzQgLTY4LjA0MzEsMjA0LjExNzAxIC0yMDQuMTI5MSwyMDQuMTE3MDEgLTEzNi4wODYwNCwwIC0yMDQuMTI5MDUsLTY4LjA1NTAyIC0yMDQuMTI5MDUsLTIwNC4xMTcwMSAwLC0xMzYuMDYyIDY4LjA0MzAxLC0yMDQuMTE3MDIgMjA0LjEyOTA1LC0yMDQuMTE3MDIgMTM2LjA3NCwwIDIwNC4xMjkxLDY4LjA0MzAxIDIwNC4xMjkxLDIwNC4xMTcwMiB6IgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuODUwOTgiCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtcnVsZT0ibm9uemVybyIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIxLjEyNDYyIgogICAgICAgICBpZD0icGF0aDUtNyIKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJzc3NzcyIKICAgICAgICAgc3R5bGU9ImZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MC4xNDkwMjtzdHJva2U6bm9uZTtzdHJva2Utb3BhY2l0eToxIiAvPjxnCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC4zODAzOSIKICAgICAgICAgZmlsbD0iIzc1YzhmZiIKICAgICAgICAgZmlsbC1ydWxlPSJldmVub2RkIgogICAgICAgICBzdHJva2Utd2lkdGg9IjEiCiAgICAgICAgIGlkPSJnNCIgLz48cGF0aAogICAgICAgICBkPSJtIDExODEuNTA5LDM1MCBjIDAsMTIwLjk5NDczIC02MC41MDMsMTgxLjQ5ODMyIC0xODEuNTA5LDE4MS40OTgzMiAtMTIxLjAwNiwwIC0xODEuNTA5LC02MC41MTM2OCAtMTgxLjUwOSwtMTgxLjQ5ODMyIDAsLTEyMC45ODQ2NSA2MC41MDMsLTE4MS40OTgzMiAxODEuNTA5LC0xODEuNDk4MzIgMTIwLjk5NTMsMCAxODEuNTA5LDYwLjUwMyAxODEuNTA5LDE4MS40OTgzMiB6IgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuODUwOTgiCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtcnVsZT0ibm9uemVybyIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIxIgogICAgICAgICBpZD0icGF0aDUiCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0ic3Nzc3MiCiAgICAgICAgIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjAuODU7c3Ryb2tlOm5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIgLz48ZwogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMzgwMzkiCiAgICAgICAgIGZpbGw9IiM3NWM4ZmYiCiAgICAgICAgIGZpbGwtcnVsZT0iZXZlbm9kZCIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIxIgogICAgICAgICBpZD0iZzciIC8+PC9nPjwvZz48ZwogICAgIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIKICAgICBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpc1BhaW50aW5nTGF5ZXImcXVvdDs6dHJ1ZX0iCiAgICAgaWQ9Imc5NyIKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjE2MTk3NTUxLDAsMCwwLjE2NzUzNjg2LC01NC44NDEzNTMsLTcuMzQ0NzgxNykiPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzE2IiAvPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzI5IiAvPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzQxIiAvPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzU1IiAvPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzY4IiAvPjxnCiAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICBpZD0iZzgzIiAvPjxnCiAgICAgICBmaWxsPSJub25lIgogICAgICAgc3Ryb2tlPSIjZmZmZmZmIgogICAgICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgICAgc3Ryb2tlLXdpZHRoPSIyMCIKICAgICAgIGlkPSJnOTEiIC8+PGcKICAgICAgIGZpbGw9Im5vbmUiCiAgICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiCiAgICAgICBpZD0iZzk0IiAvPjxnCiAgICAgICBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiCiAgICAgICBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpc1BhaW50aW5nTGF5ZXImcXVvdDs6dHJ1ZX0iCiAgICAgICBpZD0iZzk3LTAiCiAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjc5MDAwMjY3LDAsMCwwLjc5MDAwMjY3LDM1MS42MDAxNSwzOS42NTE4NDkpIgogICAgICAgc3R5bGU9ImRpc3BsYXk6aW5saW5lIj48ZwogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgICBpZD0iZzE2LTkiIC8+PGcKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMCIKICAgICAgICAgaWQ9ImcyOS00IiAvPjxnCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICAgIGlkPSJnNDEtOCIgLz48ZwogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgICBpZD0iZzU1LTgiIC8+PGcKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMCIKICAgICAgICAgaWQ9Imc2OC0yIiAvPjxnCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICAgIGlkPSJnODMtNCIgLz48ZwogICAgICAgICBmaWxsPSJub25lIgogICAgICAgICBzdHJva2U9IiNmZmZmZmYiCiAgICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIyMCIKICAgICAgICAgaWQ9Imc5MS01IiAvPjxnCiAgICAgICAgIGZpbGw9Im5vbmUiCiAgICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICAgaWQ9Imc5NC01IiAvPjxnCiAgICAgICAgIGZpbGw9Im5vbmUiCiAgICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICAgaWQ9Imc5Ni0xIiAvPjwvZz48ZwogICAgICAgZmlsbD0ibm9uZSIKICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgIGlkPSJnOTYiPjxwYXRoCiAgICAgICAgIHN0cm9rZT0iIzAwMDAwMCIKICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9IjAuMTUiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iNDUiCiAgICAgICAgIGQ9Im0gNTA3LjM5NiwyMTQuMzEgaCA0My4zNTggbSAtMjEuNjc5LC0yMS42NzggdiA0My4zNTciCiAgICAgICAgIGlkPSJwYXRoOTUiIC8+PHBhdGgKICAgICAgICAgc3Ryb2tlPSIjZmZmZmZmIgogICAgICAgICBzdHJva2Utd2lkdGg9IjI1IgogICAgICAgICBkPSJtIDUwNy4zOTYsMjE0LjMxIGggNDMuMzU4IG0gLTIxLjY3OSwtMjEuNjc4IHYgNDMuMzU3IgogICAgICAgICBpZD0icGF0aDk2IgogICAgICAgICBzdHlsZT0ic3Ryb2tlOiNmZmZmZmY7c3Ryb2tlLW9wYWNpdHk6MC45NSIgLz48L2c+PC9nPjxnCiAgICAgaWQ9ImcxIgogICAgIHRyYW5zZm9ybT0ibWF0cml4KDEuMDg5OTg1MywwLDAsMS4xMjc0MDk0LC0wLjg4NzY2MjU5LC0xLjg5NTEyMTcpIj48ZwogICAgICAgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIgogICAgICAgaWQ9ImczIgogICAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIyMC4xNzc4MywtMTYwLjY0NTk4KSIgLz48ZwogICAgICAgaWQ9Imc1IgogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC4wODc2MTI5MSwwLjA1MDU4MzM0LC0wLjA1MDU4MzM0LDAuMDg3NjEyOTEsMi45OTY5MjQ1LC04LjMzMjkyNzgpIj48ZwogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiCiAgICAgICAgIHN0eWxlPSJtaXgtYmxlbmQtbW9kZTpub3JtYWw7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjEwO3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowIgogICAgICAgICBpZD0iZzQtMCIKICAgICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC44NjQ0ODg1LDAsMCwwLjg2NDQ4ODUsNTAuNTcyMiw4Ljg4NDIwMjEpIiAvPjxnCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIHN0cm9rZT0iIzAwMDAwMCIKICAgICAgICAgc3Ryb2tlLW9wYWNpdHk9IjAuMTI5IgogICAgICAgICBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6bm9ybWFsO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDoxMDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MCIKICAgICAgICAgaWQ9Imc2Ij48cGF0aAogICAgICAgICAgIHN0cm9rZS13aWR0aD0iMTQuMTE3NCIKICAgICAgICAgICBkPSJtIDIwOS45MzIxOSw5NS4zOTQ0MSBjIC0zLjcyOTIyLC01MC41OTk2OTMgMTkuMjcwNjcsLTQzLjE0NTM2NCA0My4xNDQzMiwtNDMuMTQ1MzY0IDIzLjg3MzY2LDAgNDcuNDk2MTIsLTguMDc1ODY1IDQzLjE0NTM3LDQzLjE0NTM2NCAtMS4yNjU4NCwxNC45MDI2NyA1LjQ3NzE2LDM1LjU1MDU0IC0xOS4xNzU4NCwzNS44NTg5NSBWIDk1LjM5NDQxIGMgMCwtMTMuMjM3OSAtMTAuNzMxNjMsLTIzLjk2ODQ4OSAtMjMuOTY4NDksLTIzLjk2ODQ4OSAtMTMuMjM4OTQsMCAtMjMuOTcwNTcsMTAuNzMwNTg5IC0yMy45NzA1NywyMy45Njg0ODkgdiAzNS44NTg5NSBDIDIwNi4zMTg1OSwxMzAuMzIzNDIgMjExLjAzMTUsMTEwLjMxMDI5IDIwOS45MzIxOSw5NS4zOTQ0MSBaIG0gMTIyLjI0MzQ2LDkzLjQ4MDI0IGMgMCwwLjU3NTI0IC0wLjA5NTksMS4yNDYzNiAtMC4xOTE3NSwxLjkxNzQ4IGwgLTcuMTkwNTQsNTAuNTI3NjUgYyAtMS4wNTQ2Miw2Ljk5ODggLTYuNjE2MzUsMTIuMjcyOTEgLTEzLjgwNjg5LDEyLjI3MjkxIGggLTY1LjEwMDUgYyAtMy44MTIxOSwtMC4wMDkgLTcuNDY1OTgsLTEuNTI1OTQgLTEwLjE2MzY5LC00LjIxOTQ5IGwgLTQ3LjM2MzgxLC00Ny4zNjM4MiA3LjU3NjEyLC03LjY2OTkyIGMgMS45MTc0OCwtMS45MTc0OCA0LjYwMDkxLC0zLjE2Mzg0IDcuNTczLC0zLjE2Mzg0IDEuMjQ2MzYsMCAwLjY3MTEyLC0wLjA5NTkgMzUuMTg3ODMsNy4xOTA1NSBWIDk1LjM5NTQ1MiBjIDAsLTcuOTU3NTM4IDYuNDIzNTUsLTE0LjM4MTA5MyAxNC4zODEwOSwtMTQuMzgxMDkzIDcuOTU3NTQsMCAxNC4zODExLDYuNDIzNTU1IDE0LjM4MTEsMTQuMzgxMDkzIHYgNTcuNTI1NDE4IGggNy4yODc0NiBjIDEuODIxNiwwIDMuNTQ3MzMsMC4zODM1IDUuMTc3MTksMS4wNTQ2MSBsIDQzLjUyODg2LDIxLjY2ODU2IGMgNS4wODEzMiwyLjEwOTIzIDguNzI0NTMsNy4yODY0MiA4LjcyNDUzLDEzLjIzMDYxIHoiCiAgICAgICAgICAgaWQ9InBhdGg1LTkiCiAgICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJzc3Njc3NzY3NzY2NzY2NjY3Njc3NzY3NjY3MiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6bm9uZSIgLz48cGF0aAogICAgICAgICAgIHN0cm9rZT0ibm9uZSIKICAgICAgICAgICBkPSJtIDIxMy45NTg3MSw5NC44MDA5OTkgYyAtMS4xMzQxNCwtNDEuMDYyMTc5IDE3LjU4MjA2LC0zOS4zNjQ3IDM5LjM2Mzc2LC0zOS4zNjQ3IDIxLjc4MTcxLDAgNDEuMDY1OTMsLTEuNjk3NDc5IDM5LjM2NDcxLDM5LjM2NDcgLTAuNTY0ODYsMTMuNjM0MDgxIDcuMjY1NTIsMzMuNTY5NTMxIC0xNy40OTU1MywzMi43MTY3NzEgViA5NC44MDA5OTkgYyAwLC0xMi4wNzc5MDggLTkuNzkxMjYsLTIxLjg2ODIxOCAtMjEuODY4MjMsLTIxLjg2ODIxOCAtMTIuMDc4ODYsMCAtMjEuODcwMTMsOS43OTAzMSAtMjEuODcwMTMsMjEuODY4MjE4IHYgMzIuNzE2NzcxIGMgLTIxLjkyNTY4LDAuODUyNzYgLTE3LjExNzgzLC0xOS4wNzYyIC0xNy40OTQ1OCwtMzIuNzE2NzcxIHogbSAxMTQuOTE0NTQsOTcuMTE0MjkxIGMgMCwwLjUyNDg0IC0wLjA4NzUsMS4xMzcxNSAtMC4xNzQ5NCwxLjc0OTQ2IGwgLTYuNTYwNDcsNDYuMTAwMTMgYyAtMC45NjIyLDYuMzg1NTIgLTYuMDM2NTgsMTEuMTk3NDggLTEyLjU5NzA1LDExLjE5NzQ4IGggLTU5LjM5NjAxIGMgLTMuNDc4MTQsLTAuMDA5IC02LjgxMTc2LC0xLjM5MjIzIC05LjI3MzA3LC0zLjg0OTc2IGwgLTQzLjIxMzUyLC00My4yMTM1MiA2LjkxMjI2LC02Ljk5NzgzIGMgMS43NDk0NiwtMS43NDk0NiA0LjE5Nzc1LC0yLjg4NjYxIDYuOTA5NDEsLTIuODg2NjEgMS4xMzcxNSwwIDAuNjEyMzEsLTAuMDg3NSAzMi4xMDQ0Niw2LjU2MDQ3IEwgMjQwLjIwMTU0LDk0LjgwMTk0OSBjIC0wLjIzMjA3LC03LjI1NjUzMSA1Ljg2MDY4LC0xMy4xMjA5MjYgMTMuMTIwOTMsLTEzLjEyMDkyNiA3LjI2MDI1LDAgMTIuNzM5NTcsNS44NzA3MDggMTMuMTIwOTQsMTMuMTIwOTI2IGwgMy4zODI3OCw2NC4zMTAwNTEgaCA2LjY0ODg5IGMgMS42NjE5OCwwIDMuMjM2NSwwLjM0OTkgNC43MjM1NCwwLjk2MjIxIGwgMzkuNzE0NiwxOS43Njk4MiBjIDQuNjM2MDYsMS45MjQ0MSA3Ljk2MDAzLDYuNjQ3OTQgNy45NjAwMywxMi4wNzEyNiB6IgogICAgICAgICAgIGlkPSJwYXRoNi00IgogICAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0ic3NzY3Nzc2Nzc2Njc2NjY2NzY3Nzc2NzY2NzIgogICAgICAgICAgIHN0eWxlPSJzdHJva2Utd2lkdGg6MC45NTA3OTIiIC8+PC9nPjwvZz48L2c+PC9zdmc+CjwhLS1yb3RhdGlvbkNlbnRlcjo1NTguMjQ2Njg1MDAwMDAwMToyNzguNjcxODgtLT4KCg==',
                color1: '#4a90e2',
                color2: '#357abd',
                color3: '#235fa3',
                blocks: [
                    {
                        opcode: 'isPackaged',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: Scratch.translate('is packaged?')
                    },

                    {
                        opcode: 'isKeyPressed',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: Scratch.translate('is key pressed?'),
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'enter'
                            }
                        }
                    },

                    {
                        opcode: 'isMouseButtonPressed',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: Scratch.translate('is mouse button pressed?'),
                        arguments: {
                            BUTTON: {
                                type: Scratch.ArgumentType.NUMBER,
                                menu: 'mouseButtonMenu',
                                defaultValue: 0
                            }
                        }
                    },

                    {
                        opcode: 'isEditorNameEqual',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: Scratch.translate('is editor name equal?'),
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Scratch'
                            }
                        }
                    },

                    {
                       opcode: 'getExactName',
                       blockType: Scratch.BlockType.REPORTER,
                       text: Scratch.translate('editor name'),
                    },


                    {
                        opcode: 'getTimezone',
                        blockType: Scratch.BlockType.REPORTER,
                        text: Scratch.translate('get timezone')
                    },
                    {
                        opcode: 'getScreenWidth',
                        blockType: Scratch.BlockType.REPORTER,
                        text: Scratch.translate('get screen width')
                    },
                    {
                        opcode: 'getScreenHeight',
                        blockType: Scratch.BlockType.REPORTER,
                        text: Scratch.translate('get screen height')
                    },

                    {
                        opcode: 'readFromClipboard',
                        blockType: Scratch.BlockType.REPORTER,
                        text: Scratch.translate('read from clipboard')
                    },

         {
            opcode: "getOS",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("operating system"),
          },
          {
            opcode: "getBrowser",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("browser"),
          },
          {
            opcode: "getMemory",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("device memory in GB"),
          },
          {
            opcode: "getPreferredColorScheme",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers [THEME] color scheme?"),
            arguments: {
              THEME: {
                type: Scratch.ArgumentType.STRING,
                menu: "THEME",
                defaultValue: "dark",
              },
            },
          },

          {
            opcode: "getPreferredReducedMotion",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers reduced motion?"),
          },
          {
            opcode: "getPreferredContrast",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("user prefers more contrast?"),
          },

                    {
                        opcode: '0',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "Readme | v0.023"
                    }
                ],
                menus: {
                    mouseButtonMenu: [
                        { text: Scratch.translate('mouse_left'), value: 0 },
                        { text: Scratch.translate('mouse_middle'), value: 1 },
                        { text: Scratch.translate('mouse_right'), value: 2 }
                    ],
          THEME: {
            acceptReporters: true,
            items: [
              {
                text: Scratch.translate("light"),
                value: "light",
              },
              {
                text: Scratch.translate("dark"),
                value: "dark",
              },
            ],
          },
                }
            };
        }

        isPackaged() {
            return typeof scaffolding !== 'undefined';
        }

        isKeyPressed({ KEY }) {
            const keyName = Scratch.Cast.toString(KEY).toLowerCase();
            return pressedKeys[keyName] || false;
        }

    getExactName() {
        const searchInObject = (obj, depth = 0) => {
            if (depth > 3) return null; 
            if (obj === null || typeof obj !== 'object') return null;

            if (obj === window || obj === window.document || obj === window.location) {
                return null;
            }

            for (const key in obj) {
                if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

                if (key.toLowerCase().includes('name')) {
                    const value = obj[key];
                    if (typeof value === 'string' && value.trim().length > 0) {
                        return value;
                    }
                }

                const child = obj[key];
                if (child && typeof child === 'object' && !Array.isArray(child) && !(child instanceof Node)) {
                    const found = searchInObject(child, depth + 1);
                    if (found) return found;
                }
            }
            return null;
        };

        const candidates = [
            window.TurboWarp,
            window.Scratch,
            window.navigator,   
            window
        ];

        for (const obj of candidates) {
            if (obj === undefined || obj === null) continue;
            const result = searchInObject(obj);
            if (result) return result;
        }

        return this.getAppName();
    }

        isEditorNameEqual({ NAME }) {
                     const currentEditor = this.getExactName();
                     const target = Scratch.Cast.toString(NAME);
                     return currentEditor === target;
        }

        getTimezone() {
            try {
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                return timezone || 'Unknown';
            } catch (error) {
                return 'Error';
            }
        }

        getScreenWidth() {
            return window.innerWidth;
        }

        getScreenHeight() {
            return window.innerHeight;
        }

        readFromClipboard() {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return navigator.clipboard.readText().catch(() => '');
            }
            return '';
        }

    getOS() {
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Windows")) {
        return "Windows";
      } else if (userAgent.includes("Android")) {
        return "Android";
      } else if (
        userAgent.includes("iPhone") ||
        userAgent.includes("iPod") ||
        userAgent.includes("iPad")
      ) {
        return "iOS";
      } else if (userAgent.includes("Linux")) {
        return "Linux";
      } else if (userAgent.includes("CrOS")) {
        return "ChromeOS";
      } else if (userAgent.includes("Mac OS")) {
        return "macOS";
      }
      return "Other";
    }

    getBrowser() {
      const userAgent = navigator.userAgent;
      if (userAgent.includes("Chrome")) {
        return "Chrome";
      } else if (userAgent.includes("Firefox")) {
        return "Firefox";
      } else if (userAgent.includes("Safari")) {
        return "Safari";
      }
      return "Other";
    }

    getMemory() {
      if (navigator.deviceMemory == undefined) {
        return "Unsupported";
      } else {
        return navigator.deviceMemory;
      }
    }

    getPreferredColorScheme(args) {
      return (
        window.matchMedia("(prefers-color-scheme: dark)").matches ===
        (args.THEME === "dark")
      );
    }

    getPreferredReducedMotion() {
      return !!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    getPreferredContrast() {
      return !!window.matchMedia("(prefers-contrast: more)").matches;
    }


        isMouseButtonPressed({ BUTTON }) {
            const buttonIndex = Scratch.Cast.toNumber(BUTTON);
            return pressedMouseButtons[buttonIndex] || false;
        }

        0({ BUTTON }) {
            return 'not a full version | github.com//ningqi24'
        }
}
    Scratch.extensions.register(new PackagedDetection());
})(Scratch);
