/**
 * 网络请求日志浮窗（调试用）。
 * 用法：在登录页的容器里挂载——<div ref={el => { if (el) mountNetworkLog(el); }} />
 * 效果：容器内右下角出现「显示日志」按钮，点击展开所有（发送 / 接收 / 网络错误）请求，
 *       可一键「复制」全部日志文本，或「清空」。日志数据来自 api-client 的 window.__rwckNetLog。
 * 按钮 / 浮窗用绝对定位，锚定在挂载容器的右下角（而非编辑器全局角落）。
 */
import {getNetLog, clearNetLog} from './api-client';

/**
 * 把「显示日志」按钮 + 浮窗挂载到指定容器（容器需为 position:relative）。
 * 同一容器只挂载一次（用 dataset 标记防重复）。
 */
export function mountNetworkLog(container) {
    if (!container || container.dataset.netlogMounted || typeof document === 'undefined') return;
    container.dataset.netlogMounted = '1';

    const btn = document.createElement('button');
    btn.id = 'rwck-netlog-btn';
    btn.textContent = '显示日志';
    Object.assign(btn.style, {
        position: 'absolute', right: '12px', bottom: '12px', zIndex: 50,
        padding: '8px 14px', borderRadius: '18px', border: 'none',
        background: '#2b6cff', color: '#fff', cursor: 'pointer',
        font: '13px/1.2 system-ui, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,.35)'
    });

    const panel = document.createElement('div');
    panel.id = 'rwck-netlog-panel';
    Object.assign(panel.style, {
        position: 'absolute', right: '12px', bottom: '56px', zIndex: 51,
        width: 'min(560px, 92%)', maxHeight: '60%', display: 'none',
        background: '#11151c', color: '#e6e6e6', borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,.5)', overflow: 'hidden',
        font: '12px/1.45 ui-monospace, Menlo, Consolas, monospace',
        flexDirection: 'column'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', borderBottom: '1px solid #2a2f3a', background: '#0c0f14'
    });
    const title = document.createElement('span');
    title.textContent = '网络请求日志（发送 / 接收）';
    title.style.fontWeight = 'bold';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    [copyBtn, clearBtn, closeBtn].forEach(b => {
        Object.assign(b.style, {
            padding: '4px 10px', borderRadius: '6px', border: '1px solid #333',
            background: '#1b2230', color: '#e6e6e6', cursor: 'pointer', font: '12px system-ui'
        });
    });
    copyBtn.style.marginLeft = 'auto';
    clearBtn.style.marginLeft = '0';
    header.append(title, copyBtn, clearBtn, closeBtn);

    const body = document.createElement('div');
    Object.assign(body.style, {overflow: 'auto', padding: '8px 10px', flex: '1'});

    panel.append(header, body);
    container.append(btn, panel);

    function render() {
        const log = getNetLog();
        if (!log.length) {
            body.innerHTML = '<div style="color:#7a8290">暂无请求。触发登录 / 发帖 / 发布后，这里会显示所有发送与接收。</div>';
            return;
        }
        body.innerHTML = '';
        log.forEach(e => {
            const row = document.createElement('div');
            row.style.borderBottom = '1px solid #1d222c';
            row.style.padding = '6px 0';
            const time = new Date(e.t).toLocaleTimeString();
            const dirColor = e.dir.startsWith('→') ? '#7fd1ff'
                : e.dir.startsWith('✗') ? '#ff7a7a'
                : (e.ok ? '#8ce99a' : '#ffd479');
            const head = document.createElement('div');
            head.innerHTML =
                `<span style="color:#7a8290">${time}</span> ` +
                `<span style="color:${dirColor};font-weight:bold">${e.dir}</span> ` +
                `<span style="color:#fff">${e.method}</span> ` +
                `<span style="color:#cdd6e4;word-break:break-all">${e.url}</span>` +
                (e.status ? ` <span style="color:${e.ok ? '#8ce99a' : '#ffd479'}">[${e.status}]</span>` : '');
            row.append(head);
            if (e.error) {
                const err = document.createElement('div');
                err.style.color = '#ff9a9a';
                err.textContent = '错误: ' + e.error;
                row.append(err);
            }
            if (e.headers) {
                const h = document.createElement('div');
                h.style.color = '#7a8290';
                h.textContent = 'Headers: ' + JSON.stringify(e.headers);
                row.append(h);
            }
            if (e.body !== undefined && e.body !== null) {
                const b = document.createElement('div');
                b.style.color = '#9fb3c8';
                b.textContent = 'Body: ' + (typeof e.body === 'string' ? e.body : JSON.stringify(e.body));
                row.append(b);
            }
            if (e.data !== undefined && e.data !== null) {
                const d = document.createElement('div');
                d.style.color = '#b7c4d4';
                d.textContent = 'Resp: ' + (typeof e.data === 'string' ? e.data : JSON.stringify(e.data));
                row.append(d);
            }
            body.append(row);
        });
        body.scrollTop = body.scrollHeight;
    }

    function toText() {
        return getNetLog().map(e => {
            let s = `[${new Date(e.t).toLocaleTimeString()}] ${e.dir} ${e.method} ${e.url}` +
                (e.status ? ` [${e.status}]` : '');
            if (e.error) s += `\n  错误: ${e.error}`;
            if (e.headers) s += `\n  Headers: ${JSON.stringify(e.headers)}`;
            if (e.body !== undefined && e.body !== null) {
                s += `\n  Body: ${typeof e.body === 'string' ? e.body : JSON.stringify(e.body)}`;
            }
            if (e.data !== undefined && e.data !== null) {
                s += `\n  Resp: ${typeof e.data === 'string' ? e.data : JSON.stringify(e.data)}`;
            }
            return s;
        }).join('\n\n');
    }

    async function doCopy() {
        const text = toText();
        try {
            await navigator.clipboard.writeText(text);
        } catch (_) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.append(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            ta.remove();
        }
        const old = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        setTimeout(() => { copyBtn.textContent = old; }, 1200);
    }

    btn.addEventListener('click', () => {
        const show = panel.style.display === 'none';
        panel.style.display = show ? 'flex' : 'none';
        if (show) render();
    });
    copyBtn.addEventListener('click', doCopy);
    clearBtn.addEventListener('click', () => { clearNetLog(); render(); });
    closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });

    // 面板打开期间，请求持续产生 → 定时刷新
    setInterval(() => { if (panel.style.display !== 'none') render(); }, 800);
}
