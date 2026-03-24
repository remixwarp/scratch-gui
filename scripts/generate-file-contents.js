const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src', 'containers', 'super-refactor-files.js');

// 要读取的文件列表 - 包含整个项目的关键文件
const filesToRead = [
    // 根目录配置
    { name: 'package.json', path: 'package.json' },
    { name: 'README.md', path: 'README.md' },
    { name: 'webpack.config.js', path: 'webpack.config.js' },
    
    // src 根目录
    { name: 'src/index.js', path: 'src/index.js' },
    { name: 'src/app-state-hoc.jsx', path: 'src/app-state-hoc.jsx' },
    { name: 'src/index.ejs', path: 'src/index.ejs' },
    
    // reducers - 状态管理
    { name: 'src/reducers/modals.js', path: 'src/reducers/modals.js' },
    { name: 'src/reducers/gui.js', path: 'src/reducers/gui.js' },
    { name: 'src/reducers/menus.js', path: 'src/reducers/menus.js' },
    { name: 'src/reducers/locales.js', path: 'src/reducers/locales.js' },
    { name: 'src/reducers/vm.js', path: 'src/reducers/vm.js' },
    { name: 'src/reducers/mode.js', path: 'src/reducers/mode.js' },
    { name: 'src/reducers/project-state.js', path: 'src/reducers/project-state.js' },
    { name: 'src/reducers/alerts.js', path: 'src/reducers/alerts.js' },
    { name: 'src/reducers/theme.js', path: 'src/reducers/theme.js' },
    { name: 'src/reducers/timeout.js', path: 'src/reducers/timeout.js' },
    { name: 'src/reducers/tw.js', path: 'src/reducers/tw.js' },
    
    // components - UI组件
    { name: 'src/components/gui/gui.jsx', path: 'src/components/gui/gui.jsx' },
    { name: 'src/components/gui/gui.css', path: 'src/components/gui/gui.css' },
    { name: 'src/components/menu-bar/menu-bar.jsx', path: 'src/components/menu-bar/menu-bar.jsx' },
    { name: 'src/components/menu-bar/menu-bar.css', path: 'src/components/menu-bar/menu-bar.css' },
    { name: 'src/components/blocks/blocks.jsx', path: 'src/components/blocks/blocks.jsx' },
    { name: 'src/components/blocks/blocks.css', path: 'src/components/blocks/blocks.css' },
    { name: 'src/components/stage/stage.jsx', path: 'src/components/stage/stage.jsx' },
    { name: 'src/components/stage/stage.css', path: 'src/components/stage/stage.css' },
    { name: 'src/components/loader/loader.jsx', path: 'src/components/loader/loader.jsx' },
    { name: 'src/components/loader/loader.css', path: 'src/components/loader/loader.css' },
    { name: 'src/components/sprite-selector/sprite-selector.jsx', path: 'src/components/sprite-selector/sprite-selector.jsx' },
    { name: 'src/components/sprite-selector/sprite-selector.css', path: 'src/components/sprite-selector/sprite-selector.css' },
    { name: 'src/components/asset-panel/asset-panel.jsx', path: 'src/components/asset-panel/asset-panel.jsx' },
    { name: 'src/components/asset-panel/asset-panel.css', path: 'src/components/asset-panel/asset-panel.css' },
    { name: 'src/components/alerts/alerts.jsx', path: 'src/components/alerts/alerts.jsx' },
    { name: 'src/components/alerts/alert.jsx', path: 'src/components/alerts/alert.jsx' },
    { name: 'src/components/prompt/prompt.jsx', path: 'src/components/prompt/prompt.jsx' },
    { name: 'src/components/modal/modal.jsx', path: 'src/components/modal/modal.jsx' },
    { name: 'src/components/close-button/close-button.jsx', path: 'src/components/close-button/close-button.jsx' },
    { name: 'src/components/button/button.jsx', path: 'src/components/button/button.jsx' },
    { name: 'src/components/input/input.jsx', path: 'src/components/input/input.jsx' },
    { name: 'src/components/label/label.jsx', path: 'src/components/label/label.jsx' },
    { name: 'src/components/slider-prompt/slider-prompt.jsx', path: 'src/components/slider-prompt/slider-prompt.jsx' },
    { name: 'src/components/tw-settings/tw-settings-modal.jsx', path: 'src/components/tw-settings/tw-settings-modal.jsx' },
    { name: 'src/components/tw-settings/tw-settings-modal.css', path: 'src/components/tw-settings/tw-settings-modal.css' },
    
    // containers - 容器组件
    { name: 'src/containers/blocks.jsx', path: 'src/containers/blocks.jsx' },
    { name: 'src/containers/gui.jsx', path: 'src/containers/gui.jsx' },
    { name: 'src/containers/super-refactor-modal.jsx', path: 'src/containers/super-refactor-modal.jsx' },
    { name: 'src/containers/stage.jsx', path: 'src/containers/stage.jsx' },
    { name: 'src/containers/sprite-library.jsx', path: 'src/containers/sprite-library.jsx' },
    { name: 'src/containers/costume-library.jsx', path: 'src/containers/costume-library.jsx' },
    { name: 'src/containers/backdrop-library.jsx', path: 'src/containers/backdrop-library.jsx' },
    { name: 'src/containers/sound-library.jsx', path: 'src/containers/sound-library.jsx' },
    { name: 'src/containers/sound-tab.jsx', path: 'src/containers/sound-tab.jsx' },
    { name: 'src/containers/costume-tab.jsx', path: 'src/containers/costume-tab.jsx' },
    
    // lib - 工具库
    { name: 'src/lib/themes/index.js', path: 'src/lib/themes/index.js' },
    { name: 'src/lib/themes/light.js', path: 'src/lib/themes/light.js' },
    { name: 'src/lib/themes/dark.js', path: 'src/lib/themes/dark.js' },
    { name: 'src/lib/themes/high-contrast.js', path: 'src/lib/themes/high-contrast.js' },
    { name: 'src/lib/project-fetcher-hoc.jsx', path: 'src/lib/project-fetcher-hoc.jsx' },
    { name: 'src/lib/project-saver-hoc.jsx', path: 'src/lib/project-saver-hoc.jsx' },
    { name: 'src/lib/vm-listener-hoc.jsx', path: 'src/lib/vm-listener-hoc.jsx' },
    { name: 'src/lib/storage.js', path: 'src/lib/storage.js' },
    { name: 'src/lib/hash.js', path: 'src/lib/hash.js' },
    { name: 'src/lib/log.js', path: 'src/lib/log.js' },
    { name: 'src/lib/tw-security-manager.js', path: 'src/lib/tw-security-manager.js' },
    { name: 'src/lib/tw-state-manager-hoc.jsx', path: 'src/lib/tw-state-manager-hoc.jsx' },
    { name: 'src/lib/tw-interpolate.js', path: 'src/lib/tw-interpolate.js' },
    { name: 'src/lib/tw-recorder.js', path: 'src/lib/tw-recorder.js' },
    { name: 'src/lib/tw-packager-integration.js', path: 'src/lib/tw-packager-integration.js' },
    { name: 'src/lib/tw-progress-monitor.js', path: 'src/lib/tw-progress-monitor.js' },
    { name: 'src/lib/tw-project-meta-fetcher.js', path: 'src/lib/tw-project-meta-fetcher.js' },
    { name: 'src/lib/tw-restore-point-api.js', path: 'src/lib/tw-restore-point-api.js' },
    { name: 'src/lib/tw-sb3.js', path: 'src/lib/tw-sb3.js' },
    { name: 'src/lib/tw-security-manager.js', path: 'src/lib/tw-security-manager.js' },
    { name: 'src/lib/tw-state-manager-hoc.jsx', path: 'src/lib/tw-state-manager-hoc.jsx' },
    
    // addons
    { name: 'src/addons/addons.js', path: 'src/addons/addons.js' },
    { name: 'src/addons/api.js', path: 'src/addons/api.js' },
    
    // CSS样式
    { name: 'src/css/colors.css', path: 'src/css/colors.css' },
    { name: 'src/css/units.css', path: 'src/css/units.css' },
    { name: 'src/css/typography.css', path: 'src/css/typography.css' },
    { name: 'src/css/z-index.css', path: 'src/css/z-index.css' },
];

// 读取文件内容
function readFile(filePath) {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    try {
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf-8');
        } else {
            console.warn(`警告: 文件不存在 ${filePath}`);
            return `// 文件 ${filePath} 不存在`;
        }
    } catch (error) {
        console.error(`错误: 读取文件失败 ${filePath}`, error.message);
        return `// 文件 ${filePath} 读取失败: ${error.message}`;
    }
}

// 生成文件内容对象
const fileContents = {};
filesToRead.forEach(file => {
    fileContents[file.name] = readFile(file.path);
});

// 生成输出文件内容
const output = `// 此文件由 scripts/generate-file-contents.js 自动生成
// 不要手动修改此文件

export const fileContents = ${JSON.stringify(fileContents, null, 2)};

export const getFileList = () => Object.keys(fileContents);

export const getFileContent = (filename) => fileContents[filename] || \`// 文件 \${filename} 不存在\`;

export default fileContents;
`;

// 写入文件
fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

console.log('✓ 文件内容已生成');
console.log(`  输出: ${OUTPUT_FILE}`);
console.log(`  包含 ${Object.keys(fileContents).length} 个文件`);
