// Name: 哈希助手
// ID: hashhelper
// Description: 提供一些哈希函数，包括SHA-1、SHA-256、CRC32和HMAC-SHA256，用于数据完整性的验证。
// By: fhy-action  <https://github.com/fhy-action>
// License: CC BY-NC-SA 4.0
(function(Scratch) {
    'use strict';
    
    class HashHelper {
        constructor() {
            this.cryptoAvailable = typeof crypto !== 'undefined' && crypto.subtle;
            // 先算好CRC32的表，后面直接查表
            this._crcTable = this._makeCrcTable();
        }
        
        getInfo() {
            return {
                id: 'hashhelper',
                name: '哈希助手',
                color1: '#00a2e9',
                color2: '#00a2e9',
                color3: '#00a2e9',
                blocks: [
                    {
                        opcode: 'sha1',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[INPUT]的SHA-1值',
                        arguments: {
                            INPUT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'test'
                            }
                        }
                    },
                    {
                        opcode: 'sha256',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[INPUT]的SHA-256值',
                        arguments: {
                            INPUT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'test'
                            }
                        }
                    },
                    {
                        opcode: 'crc32',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[INPUT]的CRC32值',
                        arguments: {
                            INPUT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'test'
                            }
                        }
                    },
                    {
                        opcode: 'simpleHash',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[INPUT]的简单哈希(DJB2)值',
                        arguments: {
                            INPUT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'test'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'hmacSHA256',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[DATA]的HMAC-SHA256值，密钥为[KEY]',
                        arguments: {
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'text'
                            },
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'key'
                            }
                        }
                    },
                    '---',
                    {
                        opcode: 'compareHashes',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: '[HASH1]等于[HASH2]',
                        arguments: {
                            HASH1: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
                            },
                            HASH2: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
                            }
                        }
                    },
                    {
                        opcode: 'hashLength',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[HASH]的字符长度',
                        arguments: {
                            HASH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
                            }
                        }
                    },
                    {
                        opcode: 'formatHash',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '[HASH]格式化为[UPPERCASE]',
                        arguments: {
                            HASH: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'a94a8fe5ccb19ba61c4c0873d391e987982fbbd3'
                            },
                            UPPERCASE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'caseMenu',
                                defaultValue: '大写'
                            }
                        }
                    },
                    {
                        opcode: 'testCommonHash',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '测试[TEST]的SHA-1值',
                        arguments: {
                            TEST: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'testMenu',
                                defaultValue: 'test'
                            }
                        }
                    }
                ],
                menus: {
                    caseMenu: {
                        items: ['大写', '小写']
                    },
                    testMenu: {
                        items: ['test', 'hello', '你好', '空字符串', 'a', 'abc', '123']
                    }
                }
            };
        }
        
        // 把ArrayBuffer转成十六进制字符串
        _bufferToHex(buffer) {
            const bytes = new Uint8Array(buffer);
            let hex = '';
            for (let i = 0; i < bytes.length; i++) {
                hex += bytes[i].toString(16).padStart(2, '0');
            }
            return hex;
        }
        
        // 字符串转Uint8Array，兼容老环境
        _stringToUint8Array(str) {
            if (typeof TextEncoder !== 'undefined') {
                return new TextEncoder().encode(str);
            }
            
            // 没有TextEncoder时的备用
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                bytes[i] = str.charCodeAt(i) & 0xFF;
            }
            return bytes;
        }
        
        // 字符串转UTF-8字节数组，手动处理UTF-8编码
        _stringToUtf8Bytes(str) {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                let code = str.charCodeAt(i);
                
                if (code < 0x80) {
                    bytes.push(code);
                } else if (code < 0x800) {
                    bytes.push(0xC0 | (code >> 6));
                    bytes.push(0x80 | (code & 0x3F));
                } else if (code < 0x10000) {
                    bytes.push(0xE0 | (code >> 12));
                    bytes.push(0x80 | ((code >> 6) & 0x3F));
                    bytes.push(0x80 | (code & 0x3F));
                } else {
                    i++;
                    code = 0x10000 + (((code & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
                    bytes.push(0xF0 | (code >> 18));
                    bytes.push(0x80 | ((code >> 12) & 0x3F));
                    bytes.push(0x80 | ((code >> 6) & 0x3F));
                    bytes.push(0x80 | (code & 0x3F));
                }
            }
            return bytes;
        }
        
        // SHA-1主函数
        async sha1(args) {
            const input = args.INPUT.toString();
            try {
                if (!this.cryptoAvailable) {
                    return this._simpleSHA1(input);
                }
                
                const data = this._stringToUint8Array(input);
                const hashBuffer = await crypto.subtle.digest('SHA-1', data);
                return this._bufferToHex(hashBuffer);
            } catch (error) {
                console.warn('Web Crypto失败，改用备用实现:', error);
                return this._simpleSHA1(input);
            }
        }
        
        // 备用SHA-1实现，不需要Web Crypto
        _simpleSHA1(str) {
            if (str === '') return 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
            
            function rotateLeft(n, b) {
                return (n << b) | (n >>> (32 - b));
            }
            
            const bytes = this._stringToUtf8Bytes(str);
            const bitLength = bytes.length * 8;
            
            bytes.push(0x80);
            while ((bytes.length % 64) !== 56) {
                bytes.push(0x00);
            }
            
            for (let i = 7; i >= 0; i--) {
                bytes.push((bitLength >>> (i * 8)) & 0xFF);
            }
            
            let h0 = 0x67452301;
            let h1 = 0xEFCDAB89;
            let h2 = 0x98BADCFE;
            let h3 = 0x10325476;
            let h4 = 0xC3D2E1F0;
            
            for (let i = 0; i < bytes.length; i += 64) {
                const words = new Array(80);
                
                for (let j = 0; j < 16; j++) {
                    words[j] = 
                        (bytes[i + j * 4] << 24) |
                        (bytes[i + j * 4 + 1] << 16) |
                        (bytes[i + j * 4 + 2] << 8) |
                        (bytes[i + j * 4 + 3]);
                }
                
                for (let j = 16; j < 80; j++) {
                    words[j] = rotateLeft(
                        words[j - 3] ^ words[j - 8] ^ words[j - 14] ^ words[j - 16],
                        1
                    );
                }
                
                let a = h0;
                let b = h1;
                let c = h2;
                let d = h3;
                let e = h4;
                
                for (let j = 0; j < 80; j++) {
                    let f, k;
                    
                    if (j < 20) {
                        f = (b & c) | ((~b) & d);
                        k = 0x5A827999;
                    } else if (j < 40) {
                        f = b ^ c ^ d;
                        k = 0x6ED9EBA1;
                    } else if (j < 60) {
                        f = (b & c) | (b & d) | (c & d);
                        k = 0x8F1BBCDC;
                    } else {
                        f = b ^ c ^ d;
                        k = 0xCA62C1D6;
                    }
                    
                    const temp = (rotateLeft(a, 5) + f + e + k + words[j]) >>> 0;
                    e = d;
                    d = c;
                    c = rotateLeft(b, 30);
                    b = a;
                    a = temp;
                }
                
                h0 = (h0 + a) >>> 0;
                h1 = (h1 + b) >>> 0;
                h2 = (h2 + c) >>> 0;
                h3 = (h3 + d) >>> 0;
                h4 = (h4 + e) >>> 0;
            }
            
            function toHex(num) {
                let hex = '';
                for (let i = 7; i >= 0; i--) {
                    hex += ((num >>> (i * 4)) & 0xF).toString(16);
                }
                return hex;
            }
            
            return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
        }
        
        // SHA-256，需要Web Crypto
        async sha256(args) {
            const input = args.INPUT.toString();
            try {
                if (!this.cryptoAvailable) {
                    return '需要Web Crypto支持';
                }
                
                const data = this._stringToUint8Array(input);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                return this._bufferToHex(hashBuffer);
            } catch (error) {
                console.error('SHA-256出错:', error);
                return '计算SHA-256时出错';
            }
        }
        
        // CRC32，查表法实现
        crc32(args) {
            const input = args.INPUT.toString();
            if (input === '') return '00000000';
            
            let crc = 0 ^ (-1);
            
            for (let i = 0; i < input.length; i++) {
                crc = (crc >>> 8) ^ this._crcTable[(crc ^ input.charCodeAt(i)) & 0xFF];
            }
            
            return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0');
        }
        
        // 生成CRC32表
        _makeCrcTable() {
            const table = new Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let j = 0; j < 8; j++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c;
            }
            return table;
        }
        
        // DJB2简单哈希算法
        simpleHash(args) {
            const input = args.INPUT.toString();
            let hash = 5381;
            
            for (let i = 0; i < input.length; i++) {
                hash = ((hash << 5) + hash) + input.charCodeAt(i);
                hash = hash & 0xFFFFFFFF;
            }
            
            return (hash >>> 0).toString(16);
        }
        
        // HMAC-SHA256
        async hmacSHA256(args) {
            const data = args.DATA.toString();
            const key = args.KEY.toString();
            
            try {
                if (!this.cryptoAvailable) {
                    return '需要Web Crypto支持';
                }
                
                const encoder = new TextEncoder();
                const keyData = encoder.encode(key);
                const dataData = encoder.encode(data);
                
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'HMAC', hash: { name: 'SHA-256' } },
                    false,
                    ['sign']
                );
                
                const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataData);
                return this._bufferToHex(signature);
            } catch (error) {
                console.error('HMAC-SHA256出错:', error);
                return '计算HMAC-SHA256时出错';
            }
        }
        
        // 比较两个哈希值，忽略大小写
        compareHashes(args) {
            const hash1 = args.HASH1.toString().toLowerCase().trim();
            const hash2 = args.HASH2.toString().toLowerCase().trim();
            return hash1 === hash2;
        }
        
        // 获取哈希字符串长度
        hashLength(args) {
            const hash = args.HASH.toString();
            return hash.length;
        }
        
        // 转换哈希值大小写
        formatHash(args) {
            const hash = args.HASH.toString();
            const format = args.UPPERCASE.toString();
            
            if (format === '大写') {
                return hash.toUpperCase();
            }
            return hash.toLowerCase();
        }
        
        // 测试一些常用字符串的SHA-1值
        async testCommonHash(args) {
            const testStr = args.TEST.toString();
            
            switch (testStr) {
                case 'test':
                    return await this.sha1({ INPUT: 'test' });
                case 'hello':
                    return await this.sha1({ INPUT: 'hello' });
                case '你好':
                    return await this.sha1({ INPUT: '你好' });
                case '空字符串':
                    return await this.sha1({ INPUT: '' });
                case 'a':
                    return await this.sha1({ INPUT: 'a' });
                case 'abc':
                    return await this.sha1({ INPUT: 'abc' });
                case '123':
                    return await this.sha1({ INPUT: '123' });
                default:
                    return await this.sha1({ INPUT: testStr });
            }
        }
    }
    
    // 注册到AstraEditor
    Scratch.extensions.register(new HashHelper());
})(Scratch);