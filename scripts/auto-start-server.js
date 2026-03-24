const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = 3456;
const SERVER_SCRIPT = path.join(__dirname, 'dev-server.js');

// 检查端口是否被占用
function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // 端口被占用，说明服务器在运行
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false); // 端口可用，服务器未运行
        });
        server.listen(port);
    });
}

// 启动后端服务器
function startServer() {
    return new Promise((resolve, reject) => {
        console.log('[超级重构] 正在启动后端服务器...');
        
        const child = spawn('node', [SERVER_SCRIPT], {
            detached: true,
            stdio: 'ignore'
        });
        
        child.unref();
        
        // 等待服务器启动
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkInterval = setInterval(async () => {
            attempts++;
            const isRunning = await checkPort(PORT);
            
            if (isRunning) {
                clearInterval(checkInterval);
                console.log('[超级重构] ✓ 后端服务器已启动');
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('[超级重构] ✗ 启动服务器超时');
                reject(new Error('启动服务器超时'));
            }
        }, 500);
    });
}

// 主函数
async function main() {
    try {
        const isRunning = await checkPort(PORT);
        
        if (isRunning) {
            console.log('[超级重构] ✓ 后端服务器已在运行');
            process.exit(0);
        } else {
            await startServer();
            // 给服务器一点时间来完全启动
            await new Promise(resolve => setTimeout(resolve, 1000));
            process.exit(0);
        }
    } catch (error) {
        console.error('[超级重构] 启动失败:', error.message);
        // 即使启动失败也继续，让webpack启动
        process.exit(0);
    }
}

main();
