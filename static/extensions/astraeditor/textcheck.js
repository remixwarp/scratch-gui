// Name: Text Check
// ID: textcheck
// Description: This is a text checking extension that provides blocks to check if an input is a valid character/number and whether it contains specified special characters.
// By: GALAXY__a <https://galaxyapages.mohuajz.eu.org/>
(function(Scratch) {
    'use strict';

    class TextCheckExtension {
        getInfo() {
            const translations = {
                // 中文（默认）
                'zh-cn': {
                    EXTENSION_NAME: '文字判断',
                    VALID_CHAR_NUM: '[TEXT]是否为有效字符/数字?',
                    SPECIAL_CHAR: '[TEXT]是否包含\/:*?"<>|特殊字符?',
                    TEXT_ARG: '文本'
                },
                // 英文
                'en': {
                    EXTENSION_NAME: 'Text Check',
                    VALID_CHAR_NUM: 'Does [TEXT] contain valid chars/numbers?',
                    SPECIAL_CHAR: 'Does [TEXT] contain \\/:*?"<>| special chars?',
                    TEXT_ARG: 'text'
                },
                // 可扩展其他语言（如繁体中文）
                'zh-tw': {
                    EXTENSION_NAME: '文字判斷',
                    VALID_CHAR_NUM: '[TEXT]是否為有效字元/數字?',
                    SPECIAL_CHAR: '[TEXT]是否包含\/:*?"<>|特殊字元?',
                    TEXT_ARG: '文字'
                }
            };

            // 获取当前Scratch编辑器的语言，默认使用中文
            const lang = Scratch.locale || 'zh-cn';
            // 匹配对应语言的文本（没有则用中文兜底）
            const t = translations[lang] || translations['zh-cn'];

            return {
                id: 'textcheck',
                name: t.EXTENSION_NAME,
                id: 'textcheck',
                name: '文字判断',
                color1: '#42C8F5',
                color2: '#42C8F5',
                color3: '#42C8F5',
                                // 添加自定义图标（Data URL格式）
                iconURI: 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMjcuMTgxMiIgaGVpZ2h0PSIzMjcuMTgxMiIgdmlld0JveD0iMCwwLDMyNy4xODEyLDMyNy4xODEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgeDE9Ijc2LjkwOTQiIHkxPSIxODYuNzU5MDEiIHgyPSI0MDMuMDkwNiIgeTI9IjE4Ni43NTkwMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJjb2xvci0xIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjMGMwYzAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNzYuNDA5NCwtMjMuMTY4NCkiPjxnIHN0cm9rZS1taXRlcmxpbWl0PSIxMCI+PHBhdGggZD0iTTEwOC4xMjA0NiwzNDkuODQ5NjFjLTE3LjIzNzM3LDAgLTMxLjIxMTA2LC0xMy45NzM2OSAtMzEuMjExMDYsLTMxLjIxMTA2di0yNjMuNzU5MDhjMCwtMTcuMjM3MzcgMTMuOTczNjksLTMxLjIxMTA2IDMxLjIxMTA2LC0zMS4yMTEwNmgyNjMuNzU5MDhjMTcuMjM3NCwwIDMxLjIxMTA2LDEzLjk3MzcgMzEuMjExMDYsMzEuMjExMDd2MjYzLjc1OTA4YzAsMTcuMjM3MzcgLTEzLjk3MzY2LDMxLjIxMTA2IC0zMS4yMTEwNiwzMS4yMTEwNnoiIGZpbGw9IiM0MmM4ZjUiIHN0cm9rZT0idXJsKCNjb2xvci0xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PHRleHQgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTU2LjA4Njg0LDE2Ni4zNjQ2NCkgc2NhbGUoMS41NjA1NiwxLjU2MDU2KSIgZm9udC1zaXplPSI0MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgZmlsbD0iIzQyYzhmNSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZvbnQtZmFtaWx5PSJTYW5zIFNlcmlmIiBmb250LXdlaWdodD0ibm9ybWFsIiB0ZXh0LWFuY2hvcj0ic3RhcnQiPjx0c3BhbiB4PSIwIiBkeT0iMCI+VDwvdHNwYW4+PC90ZXh0Pjx0ZXh0IHRyYW5zZm9ybT0idHJhbnNsYXRlKDI4NC40MTAxOSwzMzMuODYwNzkpIHNjYWxlKDAuMjQ2ODksMC4yNDY4OSkiIGZvbnQtc2l6ZT0iNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmb250LWZhbWlseT0iJnF1b3Q7LS0mcXVvdDssIFNhbnMgU2VyaWYiIGZvbnQtd2VpZ2h0PSJub3JtYWwiIHRleHQtYW5jaG9yPSJzdGFydCI+PHRzcGFuIHg9IjAiIGR5PSIwIj5HQUxBWFlfX2Hoia/lv4Plh7rlk4E8L3RzcGFuPjwvdGV4dD48cGF0aCBkPSJNMTEzLjEyNDkxLDg4LjU5NTA4Yy00LjMwOTM0LDAgLTcuODAyNzYsLTMuNDkzNDIgLTcuODAyNzYsLTcuODAyNzZ2LTI4LjIxODI0YzAsLTQuMzA5MzUgMy40OTM0MiwtNy44MDI3NyA3LjgwMjc2LC03LjgwMjc3aDI1My43NTAyMmM0LjMwOTM1LDAgNy44MDI3NiwzLjQ5MzQyIDcuODAyNzYsNy44MDI3N3YyOC4yMTgyNGMwLDQuMzA5MzQgLTMuNDkzNDIsNy44MDI3NiAtNy44MDI3Niw3LjgwMjc2eiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJNMjE4Ljk0MzI0LDM0Mi4yNzk5Yy00LjMwOTM1LDAgLTcuODAyNzcsLTMuNDkzNDIgLTcuODAyNzcsLTcuODAyNzd2LTI3MS45MjEwNWMwLC00LjMwOTM1IDMuNDkzNDMsLTcuODAyNzcgNy44MDI3NywtNy44MDI3N2g0Mi4xMTM1NmM0LjMwOTM1LDAgNy44MDI3NiwzLjQ5MzQyIDcuODAyNzYsNy44MDI3N3YyNzEuOTIxMDVjMCw0LjMwOTM1IC0zLjQ5MzQyLDcuODAyNzcgLTcuODAyNzYsNy44MDI3N3oiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6MTYzLjU5MDY6MTU2LjgzMTU5NS0tPg==',
                // 可选：添加小图标（积木旁边的小图标）
                blockIconURI: 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMjcuMTgxMiIgaGVpZ2h0PSIzMjcuMTgxMiIgdmlld0JveD0iMCwwLDMyNy4xODEyLDMyNy4xODEyIj48ZGVmcz48bGluZWFyR3JhZGllbnQgeDE9Ijc2LjkwOTQiIHkxPSIxODYuNzU5MDEiIHgyPSI0MDMuMDkwNiIgeTI9IjE4Ni43NTkwMSIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJjb2xvci0xIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNmZmZmZmYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjMGMwYzAiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNzYuNDA5NCwtMjMuMTY4NCkiPjxnIHN0cm9rZS1taXRlcmxpbWl0PSIxMCI+PHBhdGggZD0iTTEwOC4xMjA0NiwzNDkuODQ5NjFjLTE3LjIzNzM3LDAgLTMxLjIxMTA2LC0xMy45NzM2OSAtMzEuMjExMDYsLTMxLjIxMTA2di0yNjMuNzU5MDhjMCwtMTcuMjM3MzcgMTMuOTczNjksLTMxLjIxMTA2IDMxLjIxMTA2LC0zMS4yMTEwNmgyNjMuNzU5MDhjMTcuMjM3NCwwIDMxLjIxMTA2LDEzLjk3MzcgMzEuMjExMDYsMzEuMjExMDd2MjYzLjc1OTA4YzAsMTcuMjM3MzcgLTEzLjk3MzY2LDMxLjIxMTA2IC0zMS4yMTEwNiwzMS4yMTEwNnoiIGZpbGw9IiM0MmM4ZjUiIHN0cm9rZT0idXJsKCNjb2xvci0xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PHRleHQgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTU2LjA4Njg0LDE2Ni4zNjQ2NCkgc2NhbGUoMS41NjA1NiwxLjU2MDU2KSIgZm9udC1zaXplPSI0MCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgZmlsbD0iIzQyYzhmNSIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZvbnQtZmFtaWx5PSJTYW5zIFNlcmlmIiBmb250LXdlaWdodD0ibm9ybWFsIiB0ZXh0LWFuY2hvcj0ic3RhcnQiPjx0c3BhbiB4PSIwIiBkeT0iMCI+VDwvdHNwYW4+PC90ZXh0Pjx0ZXh0IHRyYW5zZm9ybT0idHJhbnNsYXRlKDI4NC40MTAxOSwzMzMuODYwNzkpIHNjYWxlKDAuMjQ2ODksMC4yNDY4OSkiIGZvbnQtc2l6ZT0iNDAiIHhtbDpzcGFjZT0icHJlc2VydmUiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBmb250LWZhbWlseT0iJnF1b3Q7LS0mcXVvdDssIFNhbnMgU2VyaWYiIGZvbnQtd2VpZ2h0PSJub3JtYWwiIHRleHQtYW5jaG9yPSJzdGFydCI+PHRzcGFuIHg9IjAiIGR5PSIwIj5HQUxBWFlfX2Hoia/lv4Plh7rlk4E8L3RzcGFuPjwvdGV4dD48cGF0aCBkPSJNMTEzLjEyNDkxLDg4LjU5NTA4Yy00LjMwOTM0LDAgLTcuODAyNzYsLTMuNDkzNDIgLTcuODAyNzYsLTcuODAyNzZ2LTI4LjIxODI0YzAsLTQuMzA5MzUgMy40OTM0MiwtNy44MDI3NyA3LjgwMjc2LC03LjgwMjc3aDI1My43NTAyMmM0LjMwOTM1LDAgNy44MDI3NiwzLjQ5MzQyIDcuODAyNzYsNy44MDI3N3YyOC4yMTgyNGMwLDQuMzA5MzQgLTMuNDkzNDIsNy44MDI3NiAtNy44MDI3Niw3LjgwMjc2eiIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjAiLz48cGF0aCBkPSJNMjE4Ljk0MzI0LDM0Mi4yNzk5Yy00LjMwOTM1LDAgLTcuODAyNzcsLTMuNDkzNDIgLTcuODAyNzcsLTcuODAyNzd2LTI3MS45MjEwNWMwLC00LjMwOTM1IDMuNDkzNDMsLTcuODAyNzcgNy44MDI3NywtNy44MDI3N2g0Mi4xMTM1NmM0LjMwOTM1LDAgNy44MDI3NiwzLjQ5MzQyIDcuODAyNzYsNy44MDI3N3YyNzEuOTIxMDVjMCw0LjMwOTM1IC0zLjQ5MzQyLDcuODAyNzcgLTcuODAyNzYsNy44MDI3N3oiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6MTYzLjU5MDY6MTU2LjgzMTU5NS0tPg==',
                blocks: [
                    {
                        opcode: 'isValidCharacterOrNumber',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: t.VALID_CHAR_NUM, // 多语言积木文字
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: lang === 'en' ? 'test text' : 'GALAXY__a', // 多语言默认值
                                menu: null,
                                text: t.TEXT_ARG // 参数名称多语言
                            }
                        }
                    },
                    {
                        opcode: 'containsSpecialChar',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: t.SPECIAL_CHAR, // 多语言积木文字
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: lang === 'en' ? 'test?text' : 'GALAXY__a', // 多语言默认值
                                menu: null,
                                text: t.TEXT_ARG // 参数名称多语言
                            }
                        }
                    }
                ]
            };
        }
        /**
         * 判断输入是否为有效字符/数字
         */
        isValidCharacterOrNumber(args) {
            const input = args.TEXT;
            
            // 数字类型直接返回true
            if (typeof input === 'number' && !isNaN(input)) {
                return true;
            }
            
            // 字符串类型判断
            if (typeof input === 'string') {
                const trimmedInput = input.trim();
                if (trimmedInput === '') {
                    return false;
                }
                return true;
            }
            
            // 其他类型返回false
            return false;
        }

        /**
         * 精准判断是否包含指定特殊字符：\/:*?"<>|
         * 仅匹配这8个字符，其余所有字符均返回false
         */
        containsSpecialChar(args) {
            const input = args.TEXT;
            // 统一转为字符串并去除首尾空格
            const text = String(input).trim();
            
            // 空字符串直接返回false
            if (text === '') {
                return false;
            }
            
            // 正则表达式：仅匹配 \ / : * ? " < > | 这8个字符
            // 注意：正则中需要对 \ " 进行转义，所以写成 \\ 和 \"
            const specifiedSpecialChars = /[\\/:*?"<>|]/g;
            
            // 检测文本中是否包含这些字符
            return specifiedSpecialChars.test(text);
        }
    }

    Scratch.extensions.register(new TextCheckExtension());
})(Scratch);
