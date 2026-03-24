const crypto = require('crypto');

const PASSWORD = 'RemixWarp_API_Secret_Key_2024';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(PASSWORD, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const encryptedWithIV = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]).toString('base64');
    return encryptedWithIV;
}

function decrypt(encryptedText) {
    try {
        const encryptedBuffer = Buffer.from(encryptedText, 'base64');
        const iv = encryptedBuffer.slice(0, 16);
        const encryptedData = encryptedBuffer.slice(16);
        const key = crypto.scryptSync(PASSWORD, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        console.error('解密失败:', e.message);
        return null;
    }
}

function simpleEncrypt(text) {
    return Buffer.from(text, 'utf8').toString('base64');
}

function simpleDecrypt(base64Str) {
    try {
        return Buffer.from(base64Str, 'base64').toString('utf8');
    } catch (e) {
        return null;
    }
}

function main() {
    console.log('=== API密钥加密工具 ===\n');
    
    if (process.argv.length < 3) {
        console.log('用法: node scripts/encrypt-api-key.js <your-api-key>');
        console.log('\n示例:');
        console.log('  node scripts/encrypt-api-key.js sk-madarokutonlejxkgjktphhujojhyinkpfltpxynypjvsvfq');
        console.log('\n或者直接运行脚本，它会提示你输入密钥:');
        console.log('  node scripts/encrypt-api-key.js');
        return;
    }
    
    const apiKey = process.argv[2];
    
    console.log('\n原始密钥:', apiKey);
    
    const encrypted = encrypt(apiKey);
    console.log('\n加密后的密钥 (AES-256-CBC):');
    console.log(encrypted);
    
    const decrypted = decrypt(encrypted);
    console.log('\n解密验证:', decrypted);
    console.log('\n解密结果匹配:', apiKey === decrypted ? '✓ 是' : '✗ 否');
    
    const simpleEncrypted = simpleEncrypt(apiKey);
    console.log('\n简单加密后的密钥 (Base64):');
    console.log(simpleEncrypted);
    
    const simpleDecrypted = simpleDecrypt(simpleEncrypted);
    console.log('\n简单解密验证:', simpleDecrypted);
    console.log('\n简单解密结果匹配:', apiKey === simpleDecrypted ? '✓ 是' : '✗ 否');
}

if (require.main === module) {
    main();
}

module.exports = { encrypt, decrypt, simpleEncrypt, simpleDecrypt };
