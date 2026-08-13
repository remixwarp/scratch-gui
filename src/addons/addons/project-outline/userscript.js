import WindowManager from '../../window-system/window-manager.js';

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => {
        switch (c) { case '&': return '&'; case '<': return '<'; case '>': return '>'; case '"': return '"'; case "'": return "'"; default: return c; }
    });
}

function getIcon(type) {
    const icons = {
        sprite: '🎭', costume: '🖼', sound: '🔊', script: '📜',
        variable: '🔢', list: '📋', broadcast: '📢', folder: '📁'
    };
    return icons[type] || '•';
}

export default async function ({ addon, msg, console }) {
    const vm = addon.tab.traps.vm;
    let outlineWindow = null;
    let searchDebounce = null;

    function buildTree() {
        const project = JSON.parse(vm.toJSON());
        const targets = project.targets || [];
        const tree = [];
        for (const target of targets) {
            const isStage = target.isStage;
            const node = {
                type: isStage ? 'stage' : 'sprite',
                id: target.id,
                name: target.getName ? target.getName() : target.name,
                children: [],
                expanded: true
            };
            // Costumes
            if (target.costumes && target.costumes.length) {
                const cos = { type: 'folder', name: '造型', children: target.costumes.map(c => ({ type: 'costume', name: c.name, id: c.assetId || c.md5ext })), expanded: false };
                node.children.push(cos);
            }
            // Sounds
            if (target.sounds && target.sounds.length) {
                const snd = { type: 'folder', name: '声音', children: target.sounds.map(s => ({ type: 'sound', name: s.name, id: s.assetId || s.md5ext })), expanded: false };
                node.children.push(snd);
            }
            // Scripts
            const scripts = [];
            if (target.blocks) {
                for (const id in target.blocks._blocks) {
                    const b = target.blocks._blocks[id];
                    if (b && b.opcode && b.topLevel) {
                        scripts.push({ type: 'script', name: b.opcode.replace(/_/g, ' '), id: b.id, block: b });
                    }
                }
            }
            if (scripts.length) {
                node.children.push({ type: 'folder', name: '脚本', children: scripts, expanded: false });
            }
            // Variables
            const vars = [];
            if (target.variables) {
                for (const id in target.variables) {
                    const v = target.variables[id];
                    if (v.type === 'list') {
                        vars.push({ type: 'list', name: v.name, id, value: v.value });
                    } else if (v.type === '') {
                        vars.push({ type: 'variable', name: v.name, id, value: v.value });
                    }
                }
            }
            if (vars.length) {
                node.children.push({ type: 'folder', name: '变量/列表', children: vars, expanded: false });
            }
            // Broadcasts (global, but show per target)
            const broadcasts = [];
            if (target.blocks) {
                for (const id in target.blocks._blocks) {
                    const b = target.blocks._blocks[id];
                    if (b && (b.opcode === 'event_broadcast' || b.opcode === 'event_broadcastandwait')) {
                        const input = b.inputs?.BROADCAST_INPUT;
                        if (input && input[1]) broadcasts.push({ type: 'broadcast', name: input[1], blockId: id });
                    }
                }
            }
            if (broadcasts.length) {
                node.children.push({ type: 'folder', name: '广播', children: broadcasts, expanded: false });
            }
            tree.push(node);
        }
        return tree;
    }

    function renderTree(tree, container, searchQuery = '') {
        container.innerHTML = '';
        const ul = document.createElement('ul');
        ul.style.cssText = 'list-style:none; padding:0; margin:0; font-size:13px;';
        tree.forEach(node => {
            const li = createNodeElement(node, 0, searchQuery);
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    function createNodeElement(node, depth, searchQuery) {
        const li = document.createElement('li');
        li.style.cssText = `margin:0; padding:0;`;
        const hasChildren = node.children && node.children.length;
        const matches = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const row = document.createElement('div');
        row.style.cssText = `display:flex; align-items:center; padding:${4 + depth * 12}px 4px 4px; cursor:pointer; border-radius:4px; transition:background 0.1s;${matches ? ' background:var(--control-primary); color:white;' : ''}`;
        row.onmouseenter = () => { if (!matches) row.style.background = 'var(--ui-black-transparent)'; };
        row.onmouseleave = () => { if (!matches) row.style.background = ''; };
        if (hasChildren) {
            const toggle = document.createElement('span');
            toggle.textContent = node.expanded ? '▼' : '▶';
            toggle.style.cssText = 'width:16px; text-align:center; font-size:10px; cursor:pointer; user-select:none;';
            toggle.onclick = e => { e.stopPropagation(); node.expanded = !node.expanded; refresh(); };
            row.appendChild(toggle);
        } else {
            row.appendChild(document.createElement('span')).style.width = '16px';
        }
        const icon = document.createElement('span');
        icon.textContent = getIcon(node.type) + ' ';
        icon.style.marginRight = '4px';
        row.appendChild(icon);
        const name = document.createElement('span');
        name.textContent = node.name;
        name.style.flex = '1';
        row.appendChild(name);
        li.appendChild(row);
        if (hasChildren) {
            const childUl = document.createElement('ul');
            childUl.style.cssText = 'list-style:none; padding:0; margin:0; display:' + (node.expanded ? 'block' : 'none');
            node.children.forEach(child => childUl.appendChild(createNodeElement(child, depth + 1)));
            li.appendChild(childUl);
        }
        // Click to jump
        row.onclick = e => {
            if (e.target.tagName === 'SPAN' && e.target.textContent.match(/[▶▼]/)) return;
            if (node.type === 'script' && node.blockId) {
                jumpToBlock(node.blockId);
            } else if (node.type === 'variable' || node.type === 'list') {
                showVariable(node);
            } else if (node.type === 'costume') {
                switchToCostume(node.id);
            } else if (node.type === 'sound') {
                switchToSound(node.id);
            } else if (node.type === 'broadcast') {
                jumpToBlock(node.blockId);
            }
        };
        return li;
    }

    function refresh() {
        if (outlineWindow && outlineWindow.element) {
            const container = outlineWindow.element.querySelector('.rw-po-tree');
            const search = outlineWindow.element.querySelector('.rw-po-search').value;
            renderTree(buildTree(), container, search);
        }
    }

    async function jumpToBlock(blockId) {
        const ws = Blockly.getMainWorkspace();
        const block = ws.getBlockById(blockId);
        if (block) {
            const utils = new (await import('../find-bar/blockly/Utils.js')).default(addon.tab);
            utils.scrollBlockIntoView(blockId);
            Blockly.getMainWorkspace().centerOnBlock(blockId);
        }
    }

    function showVariable(node) {
        // Switch to sprite and show variable in palette
        const target = vm.runtime.getTargetById(node.targetId);
        if (target) vm.setEditingTarget(target.id);
    }

    function switchToCostume(assetId) {
        // Open costume editor for asset
    }

    function switchToSound(assetId) {
        // Open sound editor for asset
    }

    function createWindow() {
        const win = WindowManager.createWindow({
            id: 'rw-project-outline',
            title: '项目大纲',
            width: 320,
            height: 600,
            minWidth: 280,
            minHeight: 400,
            onClose: () => { outlineWindow = null; }
        });
        outlineWindow = win;
        const container = win.getContentElement();
        container.style.padding = '8px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.innerHTML = `
            <style>
                .rw-po-search { width:100%; padding:6px 8px; margin-bottom:8px; border:1px solid var(--ui-black-transparent); border-radius:4px; background:var(--ui-modal-background); color:var(--text-primary); font-size:13px; box-sizing:border-box; }
                .rw-po-tree { flex:1; overflow:auto; }
            </style>
            <input class="rw-po-search" placeholder="搜索角色、积木、变量..." />
            <div class="rw-po-tree"></div>
        `;
        const searchInput = container.querySelector('.rw-po-search');
        const treeContainer = container.querySelector('.rw-po-tree');
        searchInput.addEventListener('input', e => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => refresh(), 150);
        });
        renderTree(buildTree(), treeContainer);
        win.show();
        searchInput.focus();
    }

    // 监听项目变化
    vm.runtime.on('PROJECT_CHANGED', () => { if (outlineWindow) refresh(); });
    vm.runtime.on('targetsUpdate', () => { if (outlineWindow) refresh(); });

    window.RWProjectOutline = { show: createWindow, toggle: () => outlineWindow ? (outlineWindow.element ? outlineWindow.hide() : createWindow()) : createWindow() };

    // 菜单入口
    if (window.RWProjectOutline) {
        // 已在 menu-bar.jsx 绑定
    }
}