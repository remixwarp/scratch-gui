import WindowManager from '../../window-system/window-manager.js';

let Profiler = null;
try { Profiler = require('scratch-vm/src/engine/profiler'); } catch (e) { Profiler = null; }

const PERFORMANCE_AVAILABLE = typeof window !== 'undefined' && window.performance && window.performance.now;

export default async function ({ addon, msg, console }) {
    if (!PERFORMANCE_AVAILABLE || !Profiler) {
        console.warn('Performance profiler unavailable: missing performance.now or profiler');
        return;
    }

    const vm = addon.tab.traps.vm;
    const runtime = vm.runtime;

    let profileDuration = addon.settings.get('profileDuration') * 1000;
    let sampleInterval = addon.settings.get('sampleInterval');
    let hotBlockLimit = addon.settings.get('hotBlockLimit');

    addon.settings.addEventListener('change', () => {
        profileDuration = addon.settings.get('profileDuration') * 1000;
        sampleInterval = addon.settings.get('sampleInterval');
        hotBlockLimit = addon.settings.get('hotBlockLimit');
    });

    let profiling = false;
    let profileStartTime = 0;
    let frameCallback = null;
    let profileTimer = null;
    let sampleTimer = null;

    // 采样数据
    const blockCounters = new Map(); // opcode -> {count, selfTime, totalTime}
    const threadSamples = []; // [{time, threadCount, runningThreads, waitingThreads, cloneCount, listItems, varCount}]
    let profilingActive = false;

    function getOpcodeName(id) {
        try { return runtime.profiler ? runtime.profiler.nameById(id) : null; } catch { return null; }
    }

    function onProfilerFrame(frame) {
        if (!profilingActive) return;
        if (frame.id < 0) return;
        const name = getOpcodeName(frame.id);
        if (!name) return;
        if (!name.startsWith('blockFunction') && frame.arg) {
            const opcode = frame.arg;
            if (!blockCounters.has(opcode)) blockCounters.set(opcode, {count: 0, selfTime: 0, totalTime: 0});
            const entry = blockCounters.get(opcode);
            entry.count += frame.count || 1;
            entry.selfTime += frame.selfTime || 0;
            entry.totalTime += frame.totalTime || 0;
        }
    }

    function sampleThreads() {
        if (!profilingActive) return;
        const threads = runtime.threads;
        let running = 0, waiting = 0, blocked = 0;
        for (const t of threads) {
            if (t.updateMonitor) continue;
            if (t.status === 0) running++;
            else if (t.status === 1 || t.status === 2 || t.status === 3) waiting++;
            else blocked++;
        }
        threadSamples.push({
            time: performance.now() - profileStartTime,
            totalThreads: threads.length,
            running,
            waiting,
            blocked,
            cloneCount: runtime._cloneCounter,
            listItems: countListItems(),
            varCount: countVariables()
        });
    }

    function countVariables() {
        let count = 0;
        for (const target of runtime.targets) {
            if (!target.isOriginal) continue;
            for (const id in target.variables) {
                if (target.variables[id].type === '') count++;
            }
        }
        return count;
    }

    function countListItems() {
        let count = 0;
        for (const target of runtime.targets) {
            for (const id in target.variables) {
                const v = target.variables[id];
                if (v.type === 'list' && Array.isArray(v.value)) count += v.value.length;
            }
        }
        return count;
    }

    function startProfiling() {
        if (profiling) return;
        profiling = true;
        profilingActive = true;
        blockCounters.clear();
        threadSamples.length = 0;
        profileStartTime = performance.now();

        if (runtime.enableProfiling) {
            frameCallback = (frame) => {
                if (!profilingActive) return;
                if (frame.id < 0) return;
                const opcode = frame.arg;
                if (opcode && typeof opcode === 'string' && !name.startsWith('Runtime') && !name.startsWith('Sequencer')) {
                    if (!blockCounters.has(opcode)) blockCounters.set(opcode, {count: 0, selfTime: 0, totalTime: 0});
                    const entry = blockCounters.get(opcode);
                    entry.count += frame.count || 1;
                    entry.selfTime += frame.selfTime || 0;
                    entry.totalTime += frame.totalTime || 0;
                }
            };
            runtime.enableProfiling(frameCallback);
        }

        sampleTimer = setInterval(sampleThreads, sampleInterval);
        profileTimer = setTimeout(stopProfiling, profileDuration);
    }

    function stopProfiling() {
        if (!profiling) return;
        profiling = false;
        profilingActive = false;
        if (profileTimer) clearTimeout(profileTimer);
        if (sampleTimer) clearInterval(sampleTimer);
        if (runtime.disableProfiling) runtime.disableProfiling();
        frameCallback = null;

        // 等待最后一次 profiler 报告
        setTimeout(() => generateReport(), 100);
    }

    function generateReport() {
        const duration = performance.now() - profileStartTime;
        const hotBlocks = Array.from(blockCounters.entries())
            .map(([opcode, data]) => ({opcode, ...data, avgTime: data.count ? data.selfTime / data.count : 0}))
            .sort((a, b) => b.selfTime - a.selfTime)
            .slice(0, hotBlockLimit);

        const threadStats = threadSamples.length ? {
            avgThreadCount: threadSamples.reduce((s, t) => s + t.totalThreads, 0) / threadSamples.length,
            maxThreads: Math.max(...threadSamples.map(t => t.totalThreads)),
            totalRunningSamples: threadSamples.reduce((s, t) => s + t.running, 0),
            totalWaitingSamples: threadSamples.reduce((s, t) => s + t.waiting, 0),
            maxCloneCount: Math.max(...threadSamples.map(t => t.cloneCount)),
            finalCloneCount: threadSamples[threadSamples.length - 1]?.cloneCount || 0,
            listItemsGrowth: threadSamples.length > 1 ? threadSamples[threadSamples.length - 1].listItems - threadSamples[0].listItems : 0,
            varCountGrowth: threadSamples.length > 1 ? threadSamples[threadSamples.length - 1].varCount - threadSamples[0].varCount : 0
        } : {};

        showReportWindow({
            duration,
            blockCount: blockCounters.size,
            hotBlocks,
            threadStats,
            sampleCount: threadSamples.length
        });
    }

    function showReportWindow(data) {
        const win = WindowManager.createWindow({
            id: 'rw-performance-profiler-report',
            title: '性能剖析报告',
            width: 700,
            height: 520,
            onClose: () => {}
        });

        const content = win.getContentElement();
        content.style.padding = '16px';
        content.style.fontSize = '13px';
        content.style.lineHeight = '1.5';
        content.innerHTML = buildReportHTML(data);
        win.show();
    }

    function buildReportHTML(d) {
        const fmt = (ms) => (ms < 1000 ? `${ms.toFixed(2)}ms` : `${(ms/1000).toFixed(2)}s`);
        const pct = (v, total) => total ? ((v/total)*100).toFixed(1) + '%' : '0%';
        const hotRows = d.hotBlocks.map((b, i) => `
            <tr>
                <td>${i+1}</td>
                <td><code>${escapeHtml(b.opcode)}</code></td>
                <td>${b.count}</td>
                <td>${fmt(b.selfTime)}</td>
                <td>${pct(b.selfTime, d.duration)}</td>
                <td>${fmt(b.avgTime)}</td>
            </tr>
        `).join('') || '<tr><td colspan="6">无热点数据</td></tr>';

        const ts = d.threadStats;
        return `
            <style>
                .rw-pp-table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
                .rw-pp-table th, .rw-pp-table td { border:1px solid var(--ui-black-transparent); padding:6px 8px; text-align:left; }
                .rw-pp-table th { background:var(--ui-secondary); }
                .rw-pp-table tr:nth-child(even) td { background:var(--ui-black-transparent); }
                .rw-pp-section { margin-top:16px; }
                .rw-pp-section h3 { margin:0 0 8px; font-size:14px; color:var(--text-primary); }
                .rw-pp-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:8px; }
                .rw-pp-card { background:var(--ui-modal-background); border:1px solid var(--ui-black-transparent); border-radius:6px; padding:12px; }
                .rw-pp-card .label { font-size:11px; color:var(--text-secondary); margin-bottom:4px; }
                .rw-pp-card .value { font-size:16px; font-weight:600; color:var(--text-primary); }
                .rw-pp-badge { display:inline-block; background:var(--control-primary); color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:8px; }
            </style>
            <div class="rw-pp-header">
                <h2>性能剖析报告</h2>
                <div style="display:flex; gap:16px; margin-top:8px; font-size:12px; color:var(--text-secondary);">
                    <span>剖析时长: ${fmt(d.duration)}</span>
                    <span>采样点: ${d.sampleCount}</span>
                    <span>涉及积木类型: ${d.blockCount}</span>
                </div>
            </div>
            <div class="rw-pp-section">
                <h3>热点积木 Top ${d.hotBlocks.length}</h3>
                <table class="rw-pp-table">
                    <thead><tr><th>排名</th><th>Opcode</th><th>调用次数</th><th>自执行时间</th><th>占比</th><th>平均耗时</th></tr></thead>
                    <tbody>${hotRows}</tbody>
                </table>
            </div>
            <div class="rw-pp-section">
                <h3>线程与资源统计</h3>
                <div class="rw-pp-grid">
                    <div class="rw-pp-card"><div class="label">平均线程数</div><div class="value">${ts.avgThreadCount?.toFixed(1) || 0}</div></div>
                    <div class="rw-pp-card"><div class="label">峰值线程数</div><div class="value">${ts.maxThreads || 0}</div></div>
                    <div class="rw-pp-card"><div class="label">运行态样本占比</div><div class="value">${ts.totalRunningSamples ? ((ts.totalRunningSamples/d.sampleCount)*100).toFixed(1)+'%' : '0%'}</div></div>
                    <div class="rw-pp-card"><div class="label">等待/阻塞态占比</div><div class="value">${ts.totalWaitingSamples ? ((ts.totalWaitingSamples/d.sampleCount)*100).toFixed(1)+'%' : '0%'}</div></div>
                    <div class="rw-pp-card"><div class="label">峰值克隆数</div><div class="value">${ts.maxCloneCount || 0}</div></div>
                    <div class="rw-pp-card"><div class="label">结束时克隆数</div><div class="value">${ts.finalCloneCount || 0}</div></div>
                    <div class="rw-pp-card"><div class="label">列表项增长</div><div class="value">${ts.listItemsGrowth || 0}</div></div>
                    <div class="rw-pp-card"><div class="label">变量增长</div><div class="value">${ts.varCountGrowth || 0}</div></div>
                </div>
            </div>
            <div class="rw-pp-section">
                <h3>建议</h3>
                <ul style="margin:8px 0; padding-left:20px; font-size:12px; color:var(--text-secondary);">
                    ${d.hotBlocks.length && d.hotBlocks[0].selfTime > d.duration * 0.15
                        ? `<li>⚠️ 积木 <code>${escapeHtml(d.hotBlocks[0].opcode)}</code> 占用 ${((d.hotBlocks[0].selfTime/d.duration)*100).toFixed(1)}% CPU 时间，考虑优化或拆分脚本</li>` : ''}
                    ${ts.totalWaitingSamples && ts.totalWaitingSamples/d.sampleCount > 0.5
                        ? `<li>⚠️ 线程等待/阻塞占比超过 50%，可能存在大量 wait/clone/broadcast 导致的阻塞</li>` : ''}
                    ${ts.listItemsGrowth > 1000
                        ? `<li>⚠️ 列表项增长 ${ts.listItemsGrowth}，检查是否有无限 append 的列表</li>` : ''}
                    ${ts.maxCloneCount > 200
                        ? `<li>⚠️ 峰值克隆数 ${ts.maxCloneCount}，接近 300 限制，可能导致卡顿</li>` : ''}
                    <li>ℹ️ 建议在项目运行稳定后重新剖析以获得更准确数据</li>
                </ul>
            </div>
        `;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => {
            switch (c) {
                case '&': return '&';
                case '<': return '<';
                case '>': return '>';
                case '"': return '"';
                case "'": return "'";
                default: return c;
            }
        });
    }

    // 注册全局 API
    window.RWPerformanceProfiler = {
        start: startProfiling,
        stop: stopProfiling,
        isProfiling: () => profiling
    };

    // 工具菜单入口（通过 menu-bar.jsx 绑定全局事件）
    addon.settings.addEventListener('change', () => {
        profileDuration = addon.settings.get('profileDuration') * 1000;
        sampleInterval = addon.settings.get('sampleInterval');
        hotBlockLimit = addon.settings.get('hotBlockLimit');
    });
}

