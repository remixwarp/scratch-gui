let toastContainer = null;

function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.id = 'rw-performance-budget-toasts';
    toastContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
    return toastContainer;
}

function showToast(message, type = 'warning', duration = 5000) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: var(--ui-modal-background);
        border: 1px solid var(--ui-black-transparent);
        border-left: 4px solid ${type === 'error' ? 'var(--error-primary)' : 'var(--control-primary)'};
        border-radius: 6px;
        padding: 12px 16px;
        max-width: 360px;
        font-size: 13px;
        color: var(--text-primary);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        animation: rw-pb-slide-in 0.3s ease-out;
        pointer-events: auto;
    `;
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:600; color:${type === 'error' ? 'var(--error-primary)' : 'var(--control-primary)'};">
                ${type === 'error' ? '⚠' : '⚡'}
            </span>
            <span>${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'rw-pb-slide-out 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    return toast;
}

const style = document.createElement('style');
style.textContent = `
    @keyframes rw-pb-slide-in {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes rw-pb-slide-out {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

function countAllBlocks(vm) {
    let count = 0;
    for (const target of vm.runtime.targets) {
        if (target.blocks && target.blocks._blocks) {
            count += Object.keys(target.blocks._blocks).length;
        }
    }
    return count;
}

function countClones(vm) {
    return vm.runtime._cloneCounter || 0;
}

function countListItems(vm) {
    let count = 0;
    for (const target of vm.runtime.targets) {
        for (const id in target.variables) {
            const v = target.variables[id];
            if (v.type === 'list' && Array.isArray(v.value)) count += v.value.length;
        }
    }
    return count;
}

function countVariables(vm) {
    let count = 0;
    for (const target of vm.runtime.targets) {
        if (!target.isOriginal) continue;
        for (const id in target.variables) {
            if (target.variables[id].type === '') count++;
        }
    }
    return count;
}

let notified = {
    blocks: false,
    clones: false,
    listItems: false,
    variables: false
};

export default async function ({ addon, msg, console }) {
    const vm = addon.tab.traps.vm;

    let checkInterval = addon.settings.get('checkInterval');
    let maxBlocks = addon.settings.get('maxBlocks');
    let maxClones = addon.settings.get('maxClones');
    let maxListItems = addon.settings.get('maxListItems');
    let maxVariables = addon.settings.get('maxVariables');
    let onlyWhenRunning = addon.settings.get('onlyWhenRunning');
    let enabled = addon.settings.get('enableBudgetAlert');

    addon.settings.addEventListener('change', () => {
        checkInterval = addon.settings.get('checkInterval');
        maxBlocks = addon.settings.get('maxBlocks');
        maxClones = addon.settings.get('maxClones');
        maxListItems = addon.settings.get('maxListItems');
        maxVariables = addon.settings.get('maxVariables');
        onlyWhenRunning = addon.settings.get('onlyWhenRunning');
        enabled = addon.settings.get('enableBudgetAlert');
        notified = { blocks: false, clones: false, listItems: false, variables: false };
    });

    let checkTimer = null;

    function checkBudgets() {
        if (!enabled) return;
        if (onlyWhenRunning && !vm.runtime.threads.some(t => t.status === 0 && !t.updateMonitor)) {
            return;
        }

        const blocks = countAllBlocks(vm);
        const clones = countClones(vm);
        const listItems = countListItems(vm);
        const variables = countVariables(vm);

        if (blocks > maxBlocks && !notified.blocks) {
            showToast(`积木数 ${blocks} 超过预算 ${maxBlocks}，建议拆分脚本或删除无用积木`, 'error');
            notified.blocks = true;
        } else if (blocks <= maxBlocks) {
            notified.blocks = false;
        }

        if (clones > maxClones && !notified.clones) {
            showToast(`克隆数 ${clones} 超过预算 ${maxClones}，接近 300 限制，请减少克隆`, 'error');
            notified.clones = true;
        } else if (clones <= maxClones) {
            notified.clones = false;
        }

        if (listItems > maxListItems && !notified.listItems) {
            showToast(`列表项总数 ${listItems} 超过预算 ${maxListItems}，检查是否有无限追加`, 'error');
            notified.listItems = true;
        } else if (listItems <= maxListItems) {
            notified.listItems = false;
        }

        if (variables > maxVariables && !notified.variables) {
            showToast(`变量数 ${variables} 超过预算 ${maxVariables}，建议合并或使用列表`, 'warning');
            notified.variables = true;
        } else if (variables <= maxVariables) {
            notified.variables = false;
        }
    }

    function startChecking() {
        if (checkTimer) clearInterval(checkTimer);
        checkTimer = setInterval(checkBudgets, checkInterval);
        checkBudgets();
    }

    function stopChecking() {
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }
    }

    // 监听项目运行状态
    vm.runtime.on('PROJECT_RUN_START', startChecking);
    vm.runtime.on('PROJECT_RUN_STOP', () => {
        if (!onlyWhenRunning) return;
        stopChecking();
        notified = { blocks: false, clones: false, listItems: false, variables: false };
    });

    // 立即检查一次（编辑模式下也检查）
    checkBudgets();
    startChecking();

    addon.settings.addEventListener('change', () => {
        checkInterval = addon.settings.get('checkInterval');
        maxBlocks = addon.settings.get('maxBlocks');
        maxClones = addon.settings.get('maxClones');
        maxListItems = addon.settings.get('maxListItems');
        maxVariables = addon.settings.get('maxVariables');
        onlyWhenRunning = addon.settings.get('onlyWhenRunning');
        enabled = addon.settings.get('enableBudgetAlert');
        notified = { blocks: false, clones: false, listItems: false, variables: false };
        startChecking();
    });

    addon.self.addEventListener('disabled', stopChecking);

    // 全局 API
    window.RWPerformanceBudget = {
        check: checkBudgets,
        setThresholds: (thresholds) => {
            if (thresholds.maxBlocks) maxBlocks = thresholds.maxBlocks;
            if (thresholds.maxClones) maxClones = thresholds.maxClones;
            if (thresholds.maxListItems) maxListItems = thresholds.maxListItems;
            if (thresholds.maxVariables) maxVariables = thresholds.maxVariables;
        }
    };
}