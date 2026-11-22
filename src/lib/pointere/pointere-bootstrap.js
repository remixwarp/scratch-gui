/**
 * PointerE URL 自动引导。
 *
 * 在页面加载时（协作容器挂载时）调用一次 bootstrap(dispatch)，统一处理三类 URL 参数：
 *   - OAuth 回调  ?code=&state=   → 完成登录，随后自动打开协作窗口并切到 PointerE tab
 *   - 直接打开    ?pe=true        → 打开协作窗口并切到 PointerE tab
 *   - 邀请房间    ?peroom=ABC123  → 打开协作窗口、切 tab、房间码预填并自动连接
 *
 * 处理完立即用 history.replaceState 清掉这些参数，避免重复消费与页面残留。
 * 「待办请求」放在 window.__POINTERE_PENDING__，由协作 modal / PointerE tab 挂载后消费。
 * 事件名统一为 pointere:open-request。
 */

import {handleCallback} from './auth.js';
import {isValidRoomCode} from './config.js';
import {openCollaborationModal} from '../../reducers/collaboration.js';

export const OPEN_REQUEST_EVENT = 'pointere:open-request';

const setPending = req => {
    try {
        window.__POINTERE_PENDING__ = req;
    } catch (e) {
        // ignore
    }
};

const emitOpenRequest = req => {
    setPending(req);
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(OPEN_REQUEST_EVENT, {detail: req}));
    } catch (e) {
        // ignore
    }
};

/** 读取并清空当前待办请求（由 modal / tab 挂载后调用）。 */
export const consumePending = () => {
    try {
        const req = window.__POINTERE_PENDING__ || null;
        window.__POINTERE_PENDING__ = null;
        return req;
    } catch (e) {
        return null;
    }
};

/** 清掉 URL 中 PointerE 相关参数。 */
const cleanParams = () => {
    if (typeof window === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        let changed = false;
        ['code', 'state', 'error', 'pe', 'peroom'].forEach(key => {
            if (url.searchParams.has(key)) {
                url.searchParams.delete(key);
                changed = true;
            }
        });
        // OAuth 也可能用 hash 形式回跳
        if (url.hash && /[#&](code|state|error)=/.test(url.hash)) {
            url.hash = '';
            changed = true;
        }
        if (changed) window.history.replaceState(null, '', url.toString());
    } catch (e) {
        // ignore
    }
};

/**
 * 请求打开协作窗口的 PointerE tab（供其它模块复用，如账号窗口跳转）。
 * @param {object} opts {room?: string}
 * @param {function} dispatch redux dispatch（打开协作 modal）
 */
export const openPointereCollab = (opts = {}, dispatch) => {
    const room = String(opts.room || '').toUpperCase();
    emitOpenRequest({
        tab: 'pointere',
        room: isValidRoomCode(room) ? room : '',
        at: Date.now()
    });
    if (typeof dispatch === 'function') {
        try {
            dispatch(openCollaborationModal());
        } catch (e) {
            // ignore
        }
    }
};

/**
 * 页面入口引导。返回 Promise。
 * @param {function} dispatch redux dispatch
 */
export const bootstrap = async dispatch => {
    if (typeof window === 'undefined') return;
    let url;
    try {
        url = new URL(window.location.href);
    } catch (e) {
        return;
    }

    const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''));
    const code = url.searchParams.get('code') || hashParams.get('code');
    const state = url.searchParams.get('state') || hashParams.get('state');
    const isCallback = !!(code || state || url.searchParams.get('error'));
    const wantsOpen = url.searchParams.get('pe') === 'true';
    const rawRoom = String(url.searchParams.get('peroom') || '').toUpperCase();
    const inviteRoom = isValidRoomCode(rawRoom) ? rawRoom : '';

    // 没有相关参数，直接返回
    if (!isCallback && !wantsOpen && !inviteRoom) return;

    // OAuth 回调：先完成登录再打开窗口，保证进去时已登录
    if (isCallback) {
        try {
            await handleCallback();
        } catch (e) {
            // 登录失败仍打开窗口，让用户看到未登录提示
        }
        cleanParams();
        emitOpenRequest({tab: 'pointere', room: '', at: Date.now()});
        if (typeof dispatch === 'function') {
            try {
                dispatch(openCollaborationModal());
            } catch (e) {
                // ignore
            }
        }
        return;
    }

    // ?pe=true / ?peroom=XXX：直接打开并切 tab，房间码随请求带上
    cleanParams();
    emitOpenRequest({tab: 'pointere', room: inviteRoom, at: Date.now()});
    if (typeof dispatch === 'function') {
        try {
            dispatch(openCollaborationModal());
        } catch (e) {
            // ignore
        }
    }
};

export default bootstrap;
