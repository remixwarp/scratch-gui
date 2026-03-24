const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const PORT = 3456;
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 文件路径映射 - 包含所有可编辑的文件
const filePathMap = {
    // 根目录配置
    'package.json': 'package.json',
    'README.md': 'README.md',
    'webpack.config.js': 'webpack.config.js',
    
    // src 根目录
    'src/index.js': 'src/index.js',
    'src/app-state-hoc.jsx': 'src/app-state-hoc.jsx',
    'src/index.ejs': 'src/index.ejs',
    
    // reducers - 状态管理
    'src/reducers/modals.js': 'src/reducers/modals.js',
    'src/reducers/gui.js': 'src/reducers/gui.js',
    'src/reducers/menus.js': 'src/reducers/menus.js',
    'src/reducers/locales.js': 'src/reducers/locales.js',
    'src/reducers/vm.js': 'src/reducers/vm.js',
    'src/reducers/mode.js': 'src/reducers/mode.js',
    'src/reducers/project-state.js': 'src/reducers/project-state.js',
    'src/reducers/alerts.js': 'src/reducers/alerts.js',
    'src/reducers/theme.js': 'src/reducers/theme.js',
    'src/reducers/timeout.js': 'src/reducers/timeout.js',
    'src/reducers/tw.js': 'src/reducers/tw.js',
    
    // components - UI组件
    'src/components/gui/gui.jsx': 'src/components/gui/gui.jsx',
    'src/components/gui/gui.css': 'src/components/gui/gui.css',
    'src/components/menu-bar/menu-bar.jsx': 'src/components/menu-bar/menu-bar.jsx',
    'src/components/menu-bar/menu-bar.css': 'src/components/menu-bar/menu-bar.css',
    'src/components/blocks/blocks.jsx': 'src/components/blocks/blocks.jsx',
    'src/components/blocks/blocks.css': 'src/components/blocks/blocks.css',
    'src/components/stage/stage.jsx': 'src/components/stage/stage.jsx',
    'src/components/stage/stage.css': 'src/components/stage/stage.css',
    'src/components/loader/loader.jsx': 'src/components/loader/loader.jsx',
    'src/components/loader/loader.css': 'src/components/loader/loader.css',
    'src/components/sprite-selector/sprite-selector.jsx': 'src/components/sprite-selector/sprite-selector.jsx',
    'src/components/sprite-selector/sprite-selector.css': 'src/components/sprite-selector/sprite-selector.css',
    'src/components/asset-panel/asset-panel.jsx': 'src/components/asset-panel/asset-panel.jsx',
    'src/components/asset-panel/asset-panel.css': 'src/components/asset-panel/asset-panel.css',
    'src/components/alerts/alerts.jsx': 'src/components/alerts/alerts.jsx',
    'src/components/alerts/alert.jsx': 'src/components/alerts/alert.jsx',
    'src/components/prompt/prompt.jsx': 'src/components/prompt/prompt.jsx',
    'src/components/modal/modal.jsx': 'src/components/modal/modal.jsx',
    'src/components/close-button/close-button.jsx': 'src/components/close-button/close-button.jsx',
    'src/components/button/button.jsx': 'src/components/button/button.jsx',
    'src/components/input/input.jsx': 'src/components/input/input.jsx',
    'src/components/label/label.jsx': 'src/components/label/label.jsx',
    'src/components/slider-prompt/slider-prompt.jsx': 'src/components/slider-prompt/slider-prompt.jsx',
    'src/components/tw-settings/tw-settings-modal.jsx': 'src/components/tw-settings/tw-settings-modal.jsx',
    'src/components/tw-settings/tw-settings-modal.css': 'src/components/tw-settings/tw-settings-modal.css',
    
    // containers - 容器组件
    'src/containers/blocks.jsx': 'src/containers/blocks.jsx',
    'src/containers/gui.jsx': 'src/containers/gui.jsx',
    'src/containers/super-refactor-modal.jsx': 'src/containers/super-refactor-modal.jsx',
    'src/containers/stage.jsx': 'src/containers/stage.jsx',
    'src/containers/sprite-library.jsx': 'src/containers/sprite-library.jsx',
    'src/containers/costume-library.jsx': 'src/containers/costume-library.jsx',
    'src/containers/backdrop-library.jsx': 'src/containers/backdrop-library.jsx',
    'src/containers/sound-library.jsx': 'src/containers/sound-library.jsx',
    'src/containers/sound-tab.jsx': 'src/containers/sound-tab.jsx',
    'src/containers/costume-tab.jsx': 'src/containers/costume-tab.jsx',
    
    // lib - 工具库
    'src/lib/themes/index.js': 'src/lib/themes/index.js',
    'src/lib/themes/light.js': 'src/lib/themes/light.js',
    'src/lib/themes/dark.js': 'src/lib/themes/dark.js',
    'src/lib/themes/high-contrast.js': 'src/lib/themes/high-contrast.js',
    'src/lib/project-fetcher-hoc.jsx': 'src/lib/project-fetcher-hoc.jsx',
    'src/lib/project-saver-hoc.jsx': 'src/lib/project-saver-hoc.jsx',
    'src/lib/vm-listener-hoc.jsx': 'src/lib/vm-listener-hoc.jsx',
    'src/lib/storage.js': 'src/lib/storage.js',
    'src/lib/hash.js': 'src/lib/hash.js',
    'src/lib/log.js': 'src/lib/log.js',
    'src/lib/tw-security-manager.js': 'src/lib/tw-security-manager.js',
    'src/lib/tw-state-manager-hoc.jsx': 'src/lib/tw-state-manager-hoc.jsx',
    'src/lib/tw-interpolate.js': 'src/lib/tw-interpolate.js',
    'src/lib/tw-recorder.js': 'src/lib/tw-recorder.js',
    'src/lib/tw-packager-integration.js': 'src/lib/tw-packager-integration.js',
    'src/lib/tw-progress-monitor.js': 'src/lib/tw-progress-monitor.js',
    'src/lib/tw-project-meta-fetcher.js': 'src/lib/tw-project-meta-fetcher.js',
    'src/lib/tw-restore-point-api.js': 'src/lib/tw-restore-point-api.js',
    'src/lib/tw-sb3.js': 'src/lib/tw-sb3.js',
    
    // addons
    'src/addons/addons.js': 'src/addons/addons.js',
    'src/addons/api.js': 'src/addons/api.js',
    
    // CSS样式
    'src/css/colors.css': 'src/css/colors.css',
    'src/css/units.css': 'src/css/units.css',
    'src/css/typography.css': 'src/css/typography.css',
    'src/css/z-index.css': 'src/css/z-index.css',
};

const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/save-file') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const { filename, content } = JSON.parse(body);
                
                if (!filename || !content) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '缺少文件名或内容' }));
                    return;
                }

                const relativePath = filePathMap[filename];
                if (!relativePath) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '未知的文件: ' + filename }));
                    return;
                }

                const fullPath = path.join(PROJECT_ROOT, relativePath);
                
                // 确保目录存在
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // 写入文件
                fs.writeFileSync(fullPath, content, 'utf-8');
                
                console.log(`✓ 已保存文件: ${filename}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `文件 ${filename} 已保存`,
                    path: relativePath
                }));

            } catch (error) {
                console.error('保存文件失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not Found' }));
    }
});

server.listen(PORT, () => {
    console.log(`\n✓ 超级重构开发服务器已启动`);
    console.log(`  端口: ${PORT}`);
    console.log(`  API: http://localhost:${PORT}/api/save-file`);
    console.log(`\n  使用方法:`);
    console.log(`  1. 在超级重构编辑器中修改文件`);
    console.log(`  2. 点击"保存到项目"按钮`);
    console.log(`  3. 文件将自动保存到磁盘`);
    console.log(`  4. webpack-dev-server 会自动重新编译\n`);
});

// 优雅退出
process.on('SIGINT', () => {
    console.log('\n\n正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
