import WindowManager from '../../window-system/window-manager.js';

const events = [];
let tracing = false;
let eventId = 0;

export default async function ({ addon, msg, console }) {
    const vm = addon.tab.traps.vm;
    const runtime = vm.runtime;

    let enabled = addon.settings.get('enableTracing');
    let maxEvents = addon.settings.get('maxEvents');
    let traceWindow = null;

    addon.settings.addEventListener('change', () => {
        enabled = addon.settings.get('enableTracing');
        maxEvents = addon.settings.get('maxEvents');
    });

    function recordEvent(type, data) {
        if (!enabled) return;
        if (events.length >= maxEvents) events.shift();
        events.push({ id: ++eventId, time: performance.now(), type, ...data });
        if (traceWindow) traceWindow.updateEvents();
    }

    // Hook broadcast
    const origBroadcast = runtime.startHats.bind(runtime);
    runtime.startHats = function (hatType, ...args) {
        recordEvent('broadcast', { hatType, target: args[1]?.target?.getName?.() });
        return origBroadcast(hatType, ...args);
    };

    // Hook when green flag / key pressed / etc
    const origGreenFlag = runtime.greenFlag.bind(runtime);
    runtime.greenFlag = function () {
        recordEvent('greenFlag', {});
        return origGreenFlag();
    };

    // Hook clone creation (createClone may not exist on all versions)
    if (typeof runtime.createClone === 'function') {
        const origCreateClone = runtime.createClone.bind(runtime);
        runtime.createClone = function (targetId, ...args) {
            recordEvent('createClone', { targetId });
            return origCreateClone(targetId, ...args);
        };
    }

    function createWindow() {
        const win = WindowManager.createWindow({
            id: 'rw-event-tracer',
            title: '事件追踪时序图',
            width: 800,
            height: 500,
            onClose: () => { traceWindow = null; }
        });
        traceWindow = win;
        const container = win.getContentElement();
        container.style.padding = '8px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';
        container.innerHTML = `
            <style>
                .rw-et-toolbar { display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
                .rw-et-btn { padding:4px 10px; border:1px solid var(--ui-black-transparent); border-radius:4px; background:var(--ui-modal-background); color:var(--text-primary); cursor:pointer; font-size:12px; }
                .rw-et-btn:hover { background:var(--ui-secondary); }
                .rw-et-btn.active { background:var(--control-primary); border-color:var(--control-primary); color:white; }
                .rw-et-canvas { flex:1; border:1px solid var(--ui-black-transparent); border-radius:4px; background:var(--ui-modal-background); }
                .rw-et-legend { display:flex; gap:12px; margin-top:8px; font-size:11px; color:var(--text-secondary); flex-wrap:wrap; }
                .rw-et-legend span { display:flex; align-items:center; gap:4px; }
                .rw-et-legend .dot { width:10px; height:10px; border-radius:50%; }
            </style>
            <div class="rw-et-toolbar">
                <button class="rw-et-btn" id="rw-et-clear">清空</button>
                <button class="rw-et-btn" id="rw-et-pause">暂停记录</button>
                <span style="margin-left:auto; font-size:12px; color:var(--text-secondary);">事件: <span id="rw-et-count">0</span></span>
            </div>
            <canvas class="rw-et-canvas" id="rw-et-canvas"></canvas>
            <div class="rw-et-legend">
                <span><span class="dot" style="background:#e74c3c;"></span> 广播</span>
                <span><span class="dot" style="background:#3498db;"></span> 绿旗</span>
                <span><span class="dot" style="background:#2ecc71;"></span> 克隆</span>
                <span><span class="dot" style="background:#f39c12;"></span> 其他</span>
            </div>
        `;
        const canvas = container.querySelector('#rw-et-canvas');
        const ctx = canvas.getContext('2d');
        const clearBtn = container.querySelector('#rw-et-clear');
        const pauseBtn = container.querySelector('#rw-et-pause');
        const countEl = container.querySelector('#rw-et-count');
        let paused = false;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            draw();
        }

        function draw() {
            if (!ctx) return;
            const w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            if (!events.length) return;
            const startTime = events[0].time;
            const endTime = events[events.length - 1].time;
            const duration = endTime - startTime || 1;
            const padding = 40;
            const plotW = w - padding * 2;
            const trackH = 40;
            const colors = { broadcast: '#e74c3c', greenFlag: '#3498db', createClone: '#2ecc71', other: '#f39c12' };
            // Draw time axis
            ctx.strokeStyle = 'var(--ui-black-transparent)';
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, h - padding);
            ctx.lineTo(w - padding, h - padding);
            ctx.stroke();
            // Draw events
            events.forEach((e, i) => {
                const x = padding + ((e.time - startTime) / duration) * plotW;
                const y = padding + (i % 4) * trackH + trackH / 2;
                ctx.fillStyle = colors[e.type] || colors.other;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'var(--text-primary)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(e.type, x, y - 8);
            });
        }

        function updateCount() {
            countEl.textContent = events.length;
        }

        clearBtn.onclick = () => { events.length = 0; eventId = 0; draw(); updateCount(); };
        pauseBtn.onclick = () => { paused = !paused; pauseBtn.classList.toggle('active', paused); pauseBtn.textContent = paused ? '继续记录' : '暂停记录'; };
        window.addEventListener('resize', resize);
        win.show();
        setTimeout(resize, 50);
        traceWindow.updateEvents = () => { draw(); updateCount(); };
    }

    // Global API
    window.RWEventTracer = { start: createWindow, toggle: () => traceWindow ? (traceWindow.element ? traceWindow.hide() : createWindow()) : createWindow() };
}