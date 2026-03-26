// Name: ningqiVariableTool
// ID: ningqiVariableTool
// Description: Allows you to create new variables within the extension, list
// By: ningqi <https://github.com/ningqi24>
// License: CC-BY-4.0

Scratch.translate.setup({
    "zh-cn": {
        "_ningqiVariableTool": "ningqiVariableTool",
        "_global": "全局",
        "_private": "私有",
        "_listVariables": "列出原版变量",
        "_listLists": "列出原版列表",
        "_listInternalVariables": "列出扩展内部变量",
        "_listInternalLists": "列出扩展内部列表",
        "_createVariable": "创建变量 [NAME]",
        "_createList": "创建列表 [NAME]",
        "_setVariable": "将 [VARIABLE] 设为 [VALUE]",
        "_changeVariable": "将 [VARIABLE] 增加 [VALUE]",
        "_getVariable": "[VARIABLE] 的值",
        "_deleteVariable": "删除变量 [NAME]",
        "_isVariableExists": "变量 [NAME] 存在",
        "_appendToList": "将 [ITEM] 加入 [LIST]",
        "_deleteListItem": "删除 [LIST] 的第 [INDEX] 项",
        "_deleteAllListItems": "删除 [LIST] 的全部项目",
        "_insertListItem": "在 [LIST] 的第 [INDEX] 项前插入 [ITEM]",
        "_replaceListItem": "将 [LIST] 的第 [INDEX] 项替换为 [ITEM]",
        "_getListItem": "[LIST] 的第 [INDEX] 项",
        "_indexOfListItem": "[LIST] 中第一个 [ITEM] 的编号",
        "_listLength": "[LIST] 的项目数",
        "_listContains": "[LIST] 包含 [ITEM]",
        "_copyList": "复制列表 [SOURCE_LIST] 的数据到列表 [TARGET_LIST]",
        "_getList": "列表 [LIST] 的值",
        "_deleteList": "删除列表 [NAME]",
        "_isListExists": "列表 [NAME] 存在",
        "_setVariablePrivacy": "设置变量 [NAME] 为 [PRIVACY]",
        "_setListPrivacy": "设置列表 [NAME] 为 [PRIVACY]",
        "_addRoleAccess": "允许角色 [ROLE] 访问 [NAME]",
        "_removeRoleAccess": "禁止角色 [ROLE] 访问 [NAME]",
        "_hasRoleAccess": "角色 [ROLE] 可访问 [NAME]"
    },
    "en": {
        "_ningqiVariableTool": "ningqiVariableTool",
        "_global": "global",
        "_private": "private",
        "_listVariables": "list original variables",
        "_listLists": "list original lists",
        "_listInternalVariables": "list internal variables",
        "_listInternalLists": "list internal lists",
        "_createVariable": "create variable [NAME]",
        "_createList": "create list [NAME]",
        "_setVariable": "set [VARIABLE] to [VALUE]",
        "_changeVariable": "change [VARIABLE] by [VALUE]",
        "_getVariable": "value of [VARIABLE]",
        "_deleteVariable": "delete variable [NAME]",
        "_isVariableExists": "variable [NAME] exists",
        "_appendToList": "append [ITEM] to [LIST]",
        "_deleteListItem": "delete item [INDEX] of [LIST]",
        "_deleteAllListItems": "delete all items of [LIST]",
        "_insertListItem": "insert [ITEM] at [INDEX] of [LIST]",
        "_replaceListItem": "replace item [INDEX] of [LIST] with [ITEM]",
        "_getListItem": "item [INDEX] of [LIST]",
        "_indexOfListItem": "index of [ITEM] in [LIST]",
        "_listLength": "length of [LIST]",
        "_listContains": "[LIST] contains [ITEM]",
        "_copyList": "copy [SOURCE_LIST] to [TARGET_LIST]",
        "_getList": "value of list [LIST]",
        "_deleteList": "delete list [NAME]",
        "_isListExists": "list [NAME] exists",
        "_setVariablePrivacy": "set variable [NAME] to [PRIVACY]",
        "_setListPrivacy": "set list [NAME] to [PRIVACY]",
        "_addRoleAccess": "allow role [ROLE] to access [NAME]",
        "_removeRoleAccess": "forbid role [ROLE] to access [NAME]",
        "_hasRoleAccess": "role [ROLE] can access [NAME]"
    },
    "zh-tw": {
        "_ningqiVariableTool": "ningqiVariableTool",
        "_global": "全域",
        "_private": "私有",
        "_listVariables": "列出原版變數",
        "_listLists": "列出原版列表",
        "_listInternalVariables": "列出擴展內部變數",
        "_listInternalLists": "列出擴展內部列表",
        "_createVariable": "建立變數 [NAME]",
        "_createList": "建立列表 [NAME]",
        "_setVariable": "將 [VARIABLE] 設為 [VALUE]",
        "_changeVariable": "將 [VARIABLE] 增加 [VALUE]",
        "_getVariable": "[VARIABLE] 的值",
        "_deleteVariable": "刪除變數 [NAME]",
        "_isVariableExists": "變數 [NAME] 存在",
        "_appendToList": "將 [ITEM] 加入 [LIST]",
        "_deleteListItem": "刪除 [LIST] 的第 [INDEX] 項",
        "_deleteAllListItems": "刪除 [LIST] 的全部項目",
        "_insertListItem": "在 [LIST] 的第 [INDEX] 項前插入 [ITEM]",
        "_replaceListItem": "將 [LIST] 的第 [INDEX] 項替換為 [ITEM]",
        "_getListItem": "[LIST] 的第 [INDEX] 項",
        "_indexOfListItem": "[LIST] 中第一個 [ITEM] 的編號",
        "_listLength": "[LIST] 的項目數",
        "_listContains": "[LIST] 包含 [ITEM]",
        "_copyList": "複製列表 [SOURCE_LIST] 的資料到列表 [TARGET_LIST]",
        "_getList": "列表 [LIST] 的值",
        "_deleteList": "刪除列表 [NAME]",
        "_isListExists": "列表 [NAME] 存在",
        "_setVariablePrivacy": "設置變數 [NAME] 為 [PRIVACY]",
        "_setListPrivacy": "設置列表 [NAME] 為 [PRIVACY]",
        "_addRoleAccess": "允許角色 [ROLE] 訪問 [NAME]",
        "_removeRoleAccess": "禁止角色 [ROLE] 訪問 [NAME]",
        "_hasRoleAccess": "角色 [ROLE] 可訪問 [NAME]"
    }
});

(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('此扩展必须在非沙盒模式下运行');
    }

    const A = Scratch.ArgumentType;
    const B = Scratch.BlockType;
    const Cast = Scratch.Cast;

    const EXTENSION_ICON = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgdmVyc2lvbj0iMS4xIgogICB3aWR0aD0iMTUuNjk1NjE4IgogICBoZWlnaHQ9IjE1LjE2OTkyMiIKICAgdmlld0JveD0iMCAwIDE1LjY5NTYxNyAxNS4xNjk5MjIiCiAgIGlkPSJzdmc5IgogICBzb2RpcG9kaTpkb2NuYW1lPSJuaW5ncWlWYXJpYWJsZS5zdmciCiAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuNC4yIChmNDMyN2Y0LCAyMDI1LTA1LTEzKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc5IgogICAgIHBhZ2Vjb2xvcj0iIzUwNTA1MCIKICAgICBib3JkZXJjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjEiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjNTA1MDUwIgogICAgIGlua3NjYXBlOnpvb209IjMuMzMiCiAgICAgaW5rc2NhcGU6Y3g9IjU1Mi40MDI0IgogICAgIGlua3NjYXBlOmN5PSIyNjYuNTE2NTIiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxMzY2IgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjcwNSIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iLTgiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ic3ZnOSI+PGlua3NjYXBlOnBhZ2UKICAgICAgIHg9Ii00LjU2Nzg3ODNlLTE0IgogICAgICAgeT0iMCIKICAgICAgIHdpZHRoPSIxNS42OTU2MTciCiAgICAgICBoZWlnaHQ9IjE1LjE2OTkyMiIKICAgICAgIGlkPSJwYWdlMiIKICAgICAgIG1hcmdpbj0iMCIKICAgICAgIGJsZWVkPSIwIiAvPjwvc29kaXBvZGk6bmFtZWR2aWV3PjxkZWZzCiAgICAgaWQ9ImRlZnMyIj48bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDUwIgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIj48c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMTg5N2YwO3N0b3Atb3BhY2l0eTowLjk0OTAxOTYxOyIKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBpZD0ic3RvcDUwIiAvPjxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMxOGFjZjA7c3RvcC1vcGFjaXR5OjAuOTQ5MDE5NjE7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNTEiIC8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQ4IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIj48c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMTg5OGYwO3N0b3Atb3BhY2l0eTowLjk0OTAxOTYxOyIKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBpZD0ic3RvcDQ4IiAvPjxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMxN2FiZWY7c3RvcC1vcGFjaXR5OjAuOTQ5MDE5NjE7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNDkiIC8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQ2IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIj48c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMTg5OGYwO3N0b3Atb3BhY2l0eTowLjk0OTAxOTYxOyIKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBpZD0ic3RvcDQ2IiAvPjxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMxN2FiZWY7c3RvcC1vcGFjaXR5OjAuNzMwMjYzMTc7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNDciIC8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQ0IgogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIj48c3RvcAogICAgICAgICBzdHlsZT0ic3RvcC1jb2xvcjojMTg5N2YwO3N0b3Atb3BhY2l0eTowLjk0OTAxOTYxOyIKICAgICAgICAgb2Zmc2V0PSIwIgogICAgICAgICBpZD0ic3RvcDQ0IiAvPjxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMxOGFjZjA7c3RvcC1vcGFjaXR5OjAuOTQ5MDE5NjE7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNDUiIC8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQKICAgICAgIGlua3NjYXBlOmNvbGxlY3Q9ImFsd2F5cyIKICAgICAgIHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDQ0IgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NDUiCiAgICAgICB4MT0iNjAuNDQ0OTE2IgogICAgICAgeTE9IjE0OS4zMjg5OSIKICAgICAgIHgyPSIxMDAuMTQyIgogICAgICAgeTI9IjE0OS4zMjg5OSIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiAvPjxsaW5lYXJHcmFkaWVudAogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIgogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50NDYiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ0NyIKICAgICAgIHgxPSI5NS43ODUwMDQiCiAgICAgICB5MT0iMTUwLjE5IgogICAgICAgeDI9IjE1OC4zMzA5OSIKICAgICAgIHkyPSIxNTAuMTkiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgLz48bGluZWFyR3JhZGllbnQKICAgICAgIGlua3NjYXBlOmNvbGxlY3Q9ImFsd2F5cyIKICAgICAgIHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDQ4IgogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50NDkiCiAgICAgICB4MT0iMTA0LjQyMiIKICAgICAgIHkxPSIxNTEuMjciCiAgICAgICB4Mj0iMTQ4Ljk3NTAxIgogICAgICAgeTI9IjE1MS4yNyIKICAgICAgIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiAvPjxsaW5lYXJHcmFkaWVudAogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIgogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50NTAiCiAgICAgICBpZD0ibGluZWFyR3JhZGllbnQ1MSIKICAgICAgIHgxPSIxNTQuMDcwMDEiCiAgICAgICB5MT0iMTUwLjY3MTAxIgogICAgICAgeDI9IjE5My43MTM3NSIKICAgICAgIHkyPSIxNTAuNjcxMDEiCiAgICAgICBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgLz48L2RlZnM+PGcKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjAzNzE1OTgxLDAsMCwwLjAzNzE1OTgxLC0yOS41NjQ3NzEsLTUuNDMyMjAxMikiCiAgICAgaWQ9Imc5IgogICAgIGlua3NjYXBlOmV4cG9ydC1maWxlbmFtZT0ibmluZ3FpVmFyaWFibGUucG5nIgogICAgIGlua3NjYXBlOmV4cG9ydC14ZHBpPSI5NiIKICAgICBpbmtzY2FwZTpleHBvcnQteWRwaT0iOTYiPjxnCiAgICAgICBzdHJva2U9Im5vbmUiCiAgICAgICBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiCiAgICAgICBpZD0iZzgiPjxwYXRoCiAgICAgICAgIGQ9Im0gMTIwMy44Njg2LDM1MC4zMDIyOSBjIDAsMTM2LjA3MzM0IC02OC4wNDMxLDIwNC4xMTcwMSAtMjA0LjEyOTEsMjA0LjExNzAxIC0xMzYuMDg2MDQsMCAtMjA0LjEyOTA1LC02OC4wNTUwMiAtMjA0LjEyOTA1LC0yMDQuMTE3MDEgMCwtMTM2LjA2MiA2OC4wNDMwMSwtMjA0LjExNzAyIDIwNC4xMjkwNSwtMjA0LjExNzAyIDEzNi4wNzQsMCAyMDQuMTI5MSw2OC4wNDMwMSAyMDQuMTI5MSwyMDQuMTE3MDIgeiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjg1MDk4IgogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLXJ1bGU9Im5vbnplcm8iCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMS4xMjQ2MiIKICAgICAgICAgaWQ9InBhdGg1LTciCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0ic3Nzc3MiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjAuMTQ5MDI7c3Ryb2tlOm5vbmU7c3Ryb2tlLW9wYWNpdHk6MSIgLz48ZwogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMzgwMzkiCiAgICAgICAgIGZpbGw9IiM3NWM4ZmYiCiAgICAgICAgIGZpbGwtcnVsZT0iZXZlbm9kZCIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIxIgogICAgICAgICBpZD0iZzQiIC8+PHBhdGgKICAgICAgICAgZD0ibSAxMTgxLjUwOSwzNTAgYyAwLDEyMC45OTQ3MyAtNjAuNTAzLDE4MS40OTgzMiAtMTgxLjUwOSwxODEuNDk4MzIgLTEyMS4wMDYsMCAtMTgxLjUwOSwtNjAuNTEzNjggLTE4MS41MDksLTE4MS40OTgzMiAwLC0xMjAuOTg0NjUgNjAuNTAzLC0xODEuNDk4MzIgMTgxLjUwOSwtMTgxLjQ5ODMyIDEyMC45OTUzLDAgMTgxLjUwOSw2MC41MDMgMTgxLjUwOSwxODEuNDk4MzIgeiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjg1MDk4IgogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLXJ1bGU9Im5vbnplcm8iCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMSIKICAgICAgICAgaWQ9InBhdGg1IgogICAgICAgICBzb2RpcG9kaTpub2RldHlwZXM9InNzc3NzIgogICAgICAgICBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eTowLjg1O3N0cm9rZTpub25lO3N0cm9rZS1vcGFjaXR5OjEiIC8+PGcKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjM4MDM5IgogICAgICAgICBmaWxsPSIjNzVjOGZmIgogICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMSIKICAgICAgICAgaWQ9Imc3IiAvPjwvZz48L2c+PGcKICAgICBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiCiAgICAgZGF0YS1wYXBlci1kYXRhPSJ7JnF1b3Q7aXNQYWludGluZ0xheWVyJnF1b3Q7OnRydWV9IgogICAgIGlkPSJnOTciCiAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC4wNjY4ODIwMywwLDAsMC4wNjY4ODIwMywtMjIuNjQ0ODExLC0yLjkzMjA4MTIpIj48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9ImcxNiIgLz48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9ImcyOSIgLz48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9Imc0MSIgLz48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9Imc1NSIgLz48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9Imc2OCIgLz48ZwogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgaWQ9Imc4MyIgLz48ZwogICAgICAgZmlsbD0ibm9uZSIKICAgICAgIHN0cm9rZT0iI2ZmZmZmZiIKICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgIHN0cm9rZS13aWR0aD0iMjAiCiAgICAgICBpZD0iZzkxIiAvPjxnCiAgICAgICBmaWxsPSJub25lIgogICAgICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgICAgaWQ9Imc5NCIgLz48ZwogICAgICAgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIgogICAgICAgZGF0YS1wYXBlci1kYXRhPSJ7JnF1b3Q7aXNQYWludGluZ0xheWVyJnF1b3Q7OnRydWV9IgogICAgICAgaWQ9Imc5Ny0wIgogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC43OTAwMDI2NywwLDAsMC43OTAwMDI2NywzNTEuNjAwMTUsMzkuNjUxODQ5KSIKICAgICAgIHN0eWxlPSJkaXNwbGF5OmlubGluZSI+PGcKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMCIKICAgICAgICAgaWQ9ImcxNi05IiAvPjxnCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICAgIGlkPSJnMjktNCIgLz48ZwogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgICBpZD0iZzQxLTgiIC8+PGcKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjIiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMCIKICAgICAgICAgaWQ9Imc1NS04IiAvPjxnCiAgICAgICAgIGZpbGw9IiNmZmZmZmYiCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC4yIgogICAgICAgICBzdHJva2Utd2lkdGg9IjAiCiAgICAgICAgIGlkPSJnNjgtMiIgLz48ZwogICAgICAgICBmaWxsPSIjZmZmZmZmIgogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMiIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIwIgogICAgICAgICBpZD0iZzgzLTQiIC8+PHBhdGgKICAgICAgICAgZmlsbD0ibm9uZSIKICAgICAgICAgc3Ryb2tlPSIjZmZmZmZmIgogICAgICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMjAiCiAgICAgICAgIGQ9Im0gODcuMzAyLDE5Ny41OSBjIDAsMCAtMTguNDE5LC0xNi4xNzYgLTE2Ljc1MiwtNDkuNTkyIDEuMzksLTI3Ljg1OSAxOS41OTIsLTQ2LjkzIDE5LjU5MiwtNDYuOTMiCiAgICAgICAgIGlkPSJwYXRoODgiCiAgICAgICAgIHNvZGlwb2RpOm5vZGV0eXBlcz0iY2NjIgogICAgICAgICBzdHlsZT0iZmlsbDpub25lO2ZpbGwtb3BhY2l0eTowLjk0OTAyO3N0cm9rZTp1cmwoI2xpbmVhckdyYWRpZW50NDUpO3N0cm9rZS1vcGFjaXR5OjAuOTQ5MDIiIC8+PHBhdGgKICAgICAgICAgZmlsbD0ibm9uZSIKICAgICAgICAgc3Ryb2tlPSIjZmZmZmZmIgogICAgICAgICBzdHJva2UtbGluZWNhcD0icm91bmQiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMjAiCiAgICAgICAgIGQ9Im0gMTY2LjkxLDEwMi40MSBjIDAsMCAxNy4wNTEsMTkuOTkgMTYuODAxLDQ3Ljg3OSAtMC4zLDMzLjQ1MiAtMTkuNjQxLDQ4LjY0MyAtMTkuNjQxLDQ4LjY0MyIKICAgICAgICAgZGF0YS1wYXBlci1kYXRhPSJ7JnF1b3Q7aW5kZXgmcXVvdDs6bnVsbH0iCiAgICAgICAgIGlkPSJwYXRoODkiCiAgICAgICAgIHN0eWxlPSJmaWxsOm5vbmU7ZmlsbC1vcGFjaXR5OjAuOTQ5MDI7c3Ryb2tlOnVybCgjbGluZWFyR3JhZGllbnQ1MSk7c3Ryb2tlLW9wYWNpdHk6MC45NDkwMiIgLz48ZwogICAgICAgICBmaWxsPSJub25lIgogICAgICAgICBzdHJva2U9IiNmZmZmZmYiCiAgICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIyMCIKICAgICAgICAgaWQ9Imc5MS01Ij48cGF0aAogICAgICAgICAgIGQ9Im0gMTM4Ljk3NSwxNzIuMDcgLTI0LjU1MywtNDEuNiIKICAgICAgICAgICBpZD0icGF0aDkwIgogICAgICAgICAgIHN0eWxlPSJmaWxsOm5vbmU7ZmlsbC1vcGFjaXR5OjAuOTQ5MDI7c3Ryb2tlOnVybCgjbGluZWFyR3JhZGllbnQ0OSk7c3Ryb2tlLW9wYWNpdHk6MC45NDkwMiIgLz48cGF0aAogICAgICAgICAgIGQ9Im0gMTQ4LjMzMSwxMzAuNDcgLTQyLjU0NiwzOS40NCIKICAgICAgICAgICBkYXRhLXBhcGVyLWRhdGE9InsmcXVvdDtpbmRleCZxdW90OzpudWxsfSIKICAgICAgICAgICBpZD0icGF0aDkxIgogICAgICAgICAgIHN0eWxlPSJmaWxsOm5vbmU7ZmlsbC1vcGFjaXR5OjAuOTQ5MDI7c3Ryb2tlOnVybCgjbGluZWFyR3JhZGllbnQ0Nyk7c3Ryb2tlLW9wYWNpdHk6MC45NDkwMiIgLz48L2c+PGcKICAgICAgICAgZmlsbD0ibm9uZSIKICAgICAgICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgICAgICBpZD0iZzk0LTUiIC8+PGcKICAgICAgICAgZmlsbD0ibm9uZSIKICAgICAgICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgICAgICBpZD0iZzk2LTEiIC8+PC9nPjxnCiAgICAgICBmaWxsPSJub25lIgogICAgICAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogICAgICAgaWQ9Imc5NiI+PHBhdGgKICAgICAgICAgc3Ryb2tlPSIjMDAwMDAwIgogICAgICAgICBzdHJva2Utb3BhY2l0eT0iMC4xNSIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSI0NSIKICAgICAgICAgZD0ibSA1MDcuMzk2LDIxNC4zMSBoIDQzLjM1OCBtIC0yMS42NzksLTIxLjY3OCB2IDQzLjM1NyIKICAgICAgICAgaWQ9InBhdGg5NSIgLz48cGF0aAogICAgICAgICBzdHJva2U9IiNmZmZmZmYiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMjUiCiAgICAgICAgIGQ9Im0gNTA3LjM5NiwyMTQuMzEgaCA0My4zNTggbSAtMjEuNjc5LC0yMS42NzggdiA0My4zNTciCiAgICAgICAgIGlkPSJwYXRoOTYiCiAgICAgICAgIHN0eWxlPSJzdHJva2U6I2ZmZmZmZjtzdHJva2Utb3BhY2l0eTowLjk1IiAvPjwvZz48L2c+PC9zdmc+CjwhLS1yb3RhdGlvbkNlbnRlcjo1NTguMjQ2Njg1MDAwMDAwMToyNzguNjcxODgtLT4KCg==';

    class ningqiVariableTool {
        constructor() {
            this.variables = Object.create(null);
            this.lists = Object.create(null);
            
            // 元数据分离：变量和列表各自独立
            this.creatorsVar = Object.create(null);
            this.creatorsList = Object.create(null);
            this.privacyVar = Object.create(null);
            this.privacyList = Object.create(null);
            this.roleAccessVar = Object.create(null);
            this.roleAccessList = Object.create(null);

            this._initVM();
        }

        _initVM() {
            // 尝试获取VM并添加事件监听
            const vm = this._getVM();
            if (vm && vm.runtime) {
                vm.runtime.on('PROJECT_START', () => this.reset());
                vm.runtime.on('PROJECT_STOP_ALL', () => this.reset());
            }
        }

        _getVM() {
            // 多种方式获取VM，兼容TurboWarp
            return Scratch.vm || (window.Scratch && window.Scratch.vm) || (window.TurboWarp && window.TurboWarp.vm);
        }

        reset() {
            this.variables = Object.create(null);
            this.lists = Object.create(null);
            this.creatorsVar = Object.create(null);
            this.creatorsList = Object.create(null);
            this.privacyVar = Object.create(null);
            this.privacyList = Object.create(null);
            this.roleAccessVar = Object.create(null);
            this.roleAccessList = Object.create(null);
        }

        getInfo() {
            return {
                id: 'ningqiVariableTool',
                name: Scratch.translate('ningqiVariableTool'),
                color1: '#0099ff94',
                color2: '#42A5F5',
                color3: '#0009ff94',
                menuIconURI: EXTENSION_ICON,
                menus: {
                    privacyOptions: [
                        { text: Scratch.translate('global'), value: 'global' },
                        { text: Scratch.translate('private'), value: 'private' }
                    ]
                },
                blocks: [
                    {opcode: 'NVT',blockType: B.LABEL,text: 'github.com/ningqi24',category: 'Variables'},
                    { opcode: 'listVariables', blockType: B.REPORTER, text: Scratch.translate('listVariables'), arguments: {}, category: 'Variables' },
                    { opcode: 'listLists', blockType: B.REPORTER, text: Scratch.translate('listLists'), arguments: {}, category: 'Lists' },
                    { opcode: 'listInternalVariables', blockType: B.REPORTER, text: Scratch.translate('listInternalVariables'), arguments: {}, category: 'Variables' },
                    { opcode: 'listInternalLists', blockType: B.REPORTER, text: Scratch.translate('listInternalLists'), arguments: {}, category: 'Lists' },
                    '---',
                    { opcode: 'createVariable', blockType: B.COMMAND, text: Scratch.translate('createVariable'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    { opcode: 'createList', blockType: B.COMMAND, text: Scratch.translate('createList'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    '---',
                    { opcode: 'setVariable', blockType: B.COMMAND, text: Scratch.translate('setVariable'), arguments: { VARIABLE: { type: A.STRING, defaultValue: '' }, VALUE: { type: A.NUMBER, defaultValue: 0 } }, category: 'Variables' },
                    { opcode: 'changeVariable', blockType: B.COMMAND, text: Scratch.translate('changeVariable'), arguments: { VARIABLE: { type: A.STRING, defaultValue: '' }, VALUE: { type: A.NUMBER, defaultValue: 1 } }, category: 'Variables' },
                    { opcode: 'getVariable', blockType: B.REPORTER, text: Scratch.translate('getVariable'), arguments: { VARIABLE: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    { opcode: 'deleteVariable', blockType: B.COMMAND, text: Scratch.translate('deleteVariable'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    { opcode: 'isVariableExists', blockType: B.BOOLEAN, text: Scratch.translate('isVariableExists'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    '---',
                    { opcode: 'appendToList', blockType: B.COMMAND, text: Scratch.translate('appendToList'), arguments: { ITEM: { type: A.STRING, defaultValue: '' }, LIST: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'deleteListItem', blockType: B.COMMAND, text: Scratch.translate('deleteListItem'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, INDEX: { type: A.NUMBER, defaultValue: 1 } }, category: 'Lists' },
                    { opcode: 'deleteAllListItems', blockType: B.COMMAND, text: Scratch.translate('deleteAllListItems'), arguments: { LIST: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'insertListItem', blockType: B.COMMAND, text: Scratch.translate('insertListItem'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, INDEX: { type: A.NUMBER, defaultValue: 1 }, ITEM: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'replaceListItem', blockType: B.COMMAND, text: Scratch.translate('replaceListItem'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, INDEX: { type: A.NUMBER, defaultValue: 1 }, ITEM: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'getListItem', blockType: B.REPORTER, text: Scratch.translate('getListItem'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, INDEX: { type: A.NUMBER, defaultValue: 1 } }, category: 'Lists' },
                    { opcode: 'indexOfListItem', blockType: B.REPORTER, text: Scratch.translate('indexOfListItem'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, ITEM: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'listLength', blockType: B.REPORTER, text: Scratch.translate('listLength'), arguments: { LIST: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'listContains', blockType: B.BOOLEAN, text: Scratch.translate('listContains'), arguments: { LIST: { type: A.STRING, defaultValue: '' }, ITEM: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'copyList', blockType: B.COMMAND, text: Scratch.translate('copyList'), arguments: { SOURCE_LIST: { type: A.STRING, defaultValue: '' }, TARGET_LIST: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'getList', blockType: B.REPORTER, text: Scratch.translate('getList'), arguments: { LIST: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'deleteList', blockType: B.COMMAND, text: Scratch.translate('deleteList'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    { opcode: 'isListExists', blockType: B.BOOLEAN, text: Scratch.translate('isListExists'), arguments: { NAME: { type: A.STRING, defaultValue: '' } }, category: 'Lists' },
                    '---',
                    { opcode: 'setVariablePrivacy', blockType: B.COMMAND, text: Scratch.translate('setVariablePrivacy'), arguments: { NAME: { type: A.STRING, defaultValue: '' }, PRIVACY: { type: A.STRING, menu: 'privacyOptions', defaultValue: Scratch.translate('global') } }, category: 'Variables' },
                    { opcode: 'setListPrivacy', blockType: B.COMMAND, text: Scratch.translate('setListPrivacy'), arguments: { NAME: { type: A.STRING, defaultValue: '' }, PRIVACY: { type: A.STRING, menu: 'privacyOptions', defaultValue: Scratch.translate('global') } }, category: 'Lists' },
                    { opcode: 'addRoleAccess', blockType: B.COMMAND, text: Scratch.translate('addRoleAccess'), arguments: { ROLE: { type: A.STRING, defaultValue: '' }, NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    { opcode: 'removeRoleAccess', blockType: B.COMMAND, text: Scratch.translate('removeRoleAccess'), arguments: { ROLE: { type: A.STRING, defaultValue: '' }, NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' },
                    { opcode: 'hasRoleAccess', blockType: B.BOOLEAN, text: Scratch.translate('hasRoleAccess'), arguments: { ROLE: { type: A.STRING, defaultValue: '' }, NAME: { type: A.STRING, defaultValue: '' } }, category: 'Variables' }
                ]
            };
        }

        // 辅助：获取当前角色（使用固定标识 __stage__ 避免冲突）
        _getCurrentRole(util) {
            if (!util || !util.target) return '__stage__';
            return util.target.isStage ? '__stage__' : util.target.sprite.name;
        }

        // 检查变量访问权限
        _canAccessVar(name, role) {
            if (this.privacyVar[name] !== 'private') return true;
            if (this.creatorsVar[name] === role) return true;
            const accessList = this.roleAccessVar[name];
            return accessList && accessList.includes(role);
        }

        // 检查列表访问权限
        _canAccessList(name, role) {
            if (this.privacyList[name] !== 'private') return true;
            if (this.creatorsList[name] === role) return true;
            const accessList = this.roleAccessList[name];
            return accessList && accessList.includes(role);
        }

        // 检查修改元数据的权限（必须为创建者或舞台）
        _canModifyMeta(name, role, isVar) {
            const creator = isVar ? this.creatorsVar[name] : this.creatorsList[name];
            // 如果还没有创建者（例如通过复制列表创建），允许第一个修改者设置（但这里我们让创建者由创建操作确定，所以正常情况下应有创建者）
            // 为防止无创建者时被任意修改，我们要求必须有创建者且为当前角色或舞台，否则拒绝
            if (creator === undefined) return false;
            return creator === role || role === '__stage__';
        }

        // 原版变量/列表查询（保持不变）
        listVariables() {
            try {
                const vm = this._getVM();
                if (!vm) return '';
                const target = vm.runtime.getEditingTarget();
                if (!target) return '';
                const vars = [];
                for (const v of Object.values(target.variables)) {
                    if (v.type === '') vars.push(v.name);
                }
                const stage = vm.runtime.getTargetForStage();
                if (stage) {
                    for (const v of Object.values(stage.variables)) {
                        if (v.type === '') vars.push(v.name);
                    }
                }
                return [...new Set(vars)].join(', ');
            } catch {
                return '';
            }
        }

        listLists() {
            try {
                const vm = this._getVM();
                if (!vm) return '';
                const target = vm.runtime.getEditingTarget();
                if (!target) return '';
                const lists = [];
                for (const v of Object.values(target.variables)) {
                    if (v.type === 'list') lists.push(v.name);
                }
                const stage = vm.runtime.getTargetForStage();
                if (stage) {
                    for (const v of Object.values(stage.variables)) {
                        if (v.type === 'list') lists.push(v.name);
                    }
                }
                return [...new Set(lists)].join(', ');
            } catch {
                return '';
            }
        }

        listInternalVariables() {
            const items = [];
            for (const name of Object.keys(this.variables)) {
                const display = this.privacyVar[name] === 'private' ? `${name} (private)` : name;
                items.push(display);
            }
            return items.join(', ');
        }

        listInternalLists() {
            const items = [];
            for (const name of Object.keys(this.lists)) {
                const display = this.privacyList[name] === 'private' ? `${name} (private)` : name;
                items.push(display);
            }
            return items.join(', ');
        }

        createVariable(args, util) {
            const name = Cast.toString(args.NAME);
            if (!name) return;
            const role = this._getCurrentRole(util);
            // 如果同名列表已存在，不影响
            this.variables[name] = 0;
            this.creatorsVar[name] = role;
            this.privacyVar[name] = 'global';
            // 不清理同名列表的元数据
        }

        createList(args, util) {
            const name = Cast.toString(args.NAME);
            if (!name) return;
            const role = this._getCurrentRole(util);
            this.lists[name] = [];
            this.creatorsList[name] = role;
            this.privacyList[name] = 'global';
        }

        setVariable(args, util) {
            const name = Cast.toString(args.VARIABLE);
            const value = Cast.toNumber(args.VALUE);
            const role = this._getCurrentRole(util);
            if (!this._canAccessVar(name, role)) return;
            this.variables[name] = value;
        }

        changeVariable(args, util) {
            const name = Cast.toString(args.VARIABLE);
            const delta = Cast.toNumber(args.VALUE);
            const role = this._getCurrentRole(util);
            if (!this._canAccessVar(name, role)) return;
            const current = this.variables[name] !== undefined ? Cast.toNumber(this.variables[name]) : 0;
            this.variables[name] = current + delta;
        }

        getVariable(args, util) {
            const name = Cast.toString(args.VARIABLE);
            const role = this._getCurrentRole(util);
            if (!this._canAccessVar(name, role)) return 0;
            const val = this.variables[name];
            return val !== undefined ? val : 0;
        }

        deleteVariable(args, util) {
            const name = Cast.toString(args.NAME);
            const role = this._getCurrentRole(util);
            if (!this._canAccessVar(name, role)) return;
            delete this.variables[name];
            delete this.creatorsVar[name];
            delete this.privacyVar[name];
            delete this.roleAccessVar[name];
            // 不影响同名列表的元数据
        }

        isVariableExists(args, util) {
            const name = Cast.toString(args.NAME);
            const role = this._getCurrentRole(util);
            if (!this._canAccessVar(name, role)) return false;
            return this.variables[name] !== undefined;
        }

        appendToList(args, util) {
            const item = Cast.toString(args.ITEM);
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            if (!this.lists[name]) this.lists[name] = [];
            this.lists[name].push(item);
        }

        deleteListItem(args, util) {
            const name = Cast.toString(args.LIST);
            let idx = Cast.toNumber(args.INDEX);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            if (!this.lists[name]) return;
            idx = Math.floor(idx) - 1;
            if (idx >= 0 && idx < this.lists[name].length) {
                this.lists[name].splice(idx, 1);
            }
        }

        deleteAllListItems(args, util) {
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            if (this.lists[name]) {
                this.lists[name] = [];
            }
        }

        insertListItem(args, util) {
            const item = Cast.toString(args.ITEM);
            const name = Cast.toString(args.LIST);
            let idx = Cast.toNumber(args.INDEX);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            if (!this.lists[name]) this.lists[name] = [];
            idx = Math.floor(idx) - 1;
            if (idx >= 0 && idx <= this.lists[name].length) {
                this.lists[name].splice(idx, 0, item);
            }
        }

        replaceListItem(args, util) {
            const item = Cast.toString(args.ITEM);
            const name = Cast.toString(args.LIST);
            let idx = Cast.toNumber(args.INDEX);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            if (!this.lists[name]) return;
            idx = Math.floor(idx) - 1;
            if (idx >= 0 && idx < this.lists[name].length) {
                this.lists[name][idx] = item;
            }
        }

        getListItem(args, util) {
            const name = Cast.toString(args.LIST);
            let idx = Cast.toNumber(args.INDEX);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return '';
            if (!this.lists[name]) return '';
            idx = Math.floor(idx) - 1;
            if (idx >= 0 && idx < this.lists[name].length) {
                return Cast.toString(this.lists[name][idx]);
            }
            return '';
        }

        indexOfListItem(args, util) {
            const item = Cast.toString(args.ITEM);
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return 0;
            if (!this.lists[name]) return 0;
            const idx = this.lists[name].indexOf(item);
            return idx === -1 ? 0 : idx + 1;
        }

        listLength(args, util) {
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return 0;
            if (!this.lists[name]) return 0;
            return this.lists[name].length;
        }

        listContains(args, util) {
            const item = Cast.toString(args.ITEM);
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return false;
            if (!this.lists[name]) return false;
            return this.lists[name].includes(item);
        }

        copyList(args, util) {
            const src = Cast.toString(args.SOURCE_LIST);
            const dst = Cast.toString(args.TARGET_LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(src, role) || !this._canAccessList(dst, role)) return;
            if (!this.lists[src]) return;
            this.lists[dst] = [...this.lists[src]];
            // 设置目标列表的创建者为当前角色（如果目标之前不存在）
            if (this.creatorsList[dst] === undefined) {
                this.creatorsList[dst] = role;
                this.privacyList[dst] = 'global'; // 默认全局
            }
            // 如果目标已存在，不修改其元数据（仅覆盖内容）
        }

        getList(args, util) {
            const name = Cast.toString(args.LIST);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return '';
            if (!this.lists[name]) return '';
            return this.lists[name].join(', ');
        }

        deleteList(args, util) {
            const name = Cast.toString(args.NAME);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return;
            delete this.lists[name];
            delete this.creatorsList[name];
            delete this.privacyList[name];
            delete this.roleAccessList[name];
        }

        isListExists(args, util) {
            const name = Cast.toString(args.NAME);
            const role = this._getCurrentRole(util);
            if (!this._canAccessList(name, role)) return false;
            return this.lists[name] !== undefined;
        }

        setVariablePrivacy(args, util) {
            const name = Cast.toString(args.NAME);
            const privacy = Cast.toString(args.PRIVACY);
            const role = this._getCurrentRole(util);
            if (!this._canModifyMeta(name, role, true)) return;
            this.privacyVar[name] = privacy;
        }

        setListPrivacy(args, util) {
            const name = Cast.toString(args.NAME);
            const privacy = Cast.toString(args.PRIVACY);
            const role = this._getCurrentRole(util);
            if (!this._canModifyMeta(name, role, false)) return;
            this.privacyList[name] = privacy;
        }

        addRoleAccess(args, util) {
            const targetRole = Cast.toString(args.ROLE);
            const name = Cast.toString(args.NAME);
            const currentRole = this._getCurrentRole(util);
            // 这里要区分是变量还是列表？根据积木放置的category，但用户可能混用。
            // 更安全的做法：同时检查变量和列表，如果存在则分别处理，但权限验证需对应各自的创建者。
            // 由于积木在Variables类别，可能预期操作变量，但用户也可能用它操作列表。我们分别处理。
            let handled = false;
            if (this.variables[name] !== undefined) {
                if (this._canModifyMeta(name, currentRole, true)) {
                    if (!this.roleAccessVar[name]) this.roleAccessVar[name] = [];
                    if (!this.roleAccessVar[name].includes(targetRole)) {
                        this.roleAccessVar[name].push(targetRole);
                    }
                    handled = true;
                }
            }
            if (this.lists[name] !== undefined) {
                if (this._canModifyMeta(name, currentRole, false)) {
                    if (!this.roleAccessList[name]) this.roleAccessList[name] = [];
                    if (!this.roleAccessList[name].includes(targetRole)) {
                        this.roleAccessList[name].push(targetRole);
                    }
                    handled = true;
                }
            }
            if (!handled) return; // 既不是变量也不是列表，或无权限
        }

        removeRoleAccess(args, util) {
            const targetRole = Cast.toString(args.ROLE);
            const name = Cast.toString(args.NAME);
            const currentRole = this._getCurrentRole(util);
            if (this.variables[name] !== undefined) {
                if (this._canModifyMeta(name, currentRole, true)) {
                    if (this.roleAccessVar[name]) {
                        const idx = this.roleAccessVar[name].indexOf(targetRole);
                        if (idx !== -1) this.roleAccessVar[name].splice(idx, 1);
                    }
                }
            }
            if (this.lists[name] !== undefined) {
                if (this._canModifyMeta(name, currentRole, false)) {
                    if (this.roleAccessList[name]) {
                        const idx = this.roleAccessList[name].indexOf(targetRole);
                        if (idx !== -1) this.roleAccessList[name].splice(idx, 1);
                    }
                }
            }
        }

        hasRoleAccess(args, util) {
            const targetRole = Cast.toString(args.ROLE);
            const name = Cast.toString(args.NAME);
            // 查询时同时检查变量和列表的权限列表，只要一个匹配就返回true
            if (this.roleAccessVar[name] && this.roleAccessVar[name].includes(targetRole)) return true;
            if (this.roleAccessList[name] && this.roleAccessList[name].includes(targetRole)) return true;
            return false;
        }
    }

    Scratch.extensions.register(new ningqiVariableTool());
})(Scratch);