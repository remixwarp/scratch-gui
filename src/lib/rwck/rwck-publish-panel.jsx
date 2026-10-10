/**
 * 创客次元（极光论坛）自由窗口主界面。
 *
 * Tab 分组（尽量覆盖 https://forum.ctspace.xyz/docs 里对普通用户开放的接口）：
 *   [登录/账户] — 验证码 + PoW + 登录 / 注册 / 改资料 / 改密码 / 退出
 *   [社区状态] — /stats/public 自检 + 最新帖 + 活跃用户 + 排行榜 + 在线状态 + 站内入口
 *   [发布作品] — 封面 / sb3 上传 / 分类 / 简介 / 允许下载
 *   [发帖]     — 讨论 + 回复（posts）
 *   [我的作品] — 更新 / 删除 / 短链
 *   [作品广场] — projects.list / get / like / 分类筛选
 *   [扩展广场] — extensions.list / my / create / update / remove / like / raw
 *   [云盘]     — drive.upload / files / usage / share / remove
 *   [资源]     — resources.upload / netdisk / rewarded / works
 *   [互动]     — comments / likes / reactions / bookmarks / follow-tags / users.follow
 *   [通知签到] — notifications / checkin
 *   [搜索]     — search
 *   [原创登记] — origmark 登记 / 验证 / 同步请求
 *   [云变量]   — cloud projects / variables / history
 *   [开发者]   — api-keys / tags / changelogs
 *
 * 主题色：整窗所有颜色都来自 props.colors（由 theme-colors.js 从编辑器当前主题推导，
 * 明暗主题自动适配）。
 */

import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import rwck from './api-client.js';
import getEditorTheme from './theme-colors.js';
import {
    Users, MessageCircle, BookOpen, BarChart3,
    Upload, FolderOpen, RefreshCw, ChevronDown, ChevronUp,
    FileCode, Eye, Heart,
    AlertCircle, CheckCircle, LogIn, LogOut,
    Activity, Tag, Globe,
    Search, Bell, Key, ShieldCheck, Package, HardDrive,
    ThumbsUp, Smile, Bookmark, UserPlus, Send, ExternalLink,
    Plus, Trash2, Star, Hash, Compass, Layers,
    Database, Zap, FileText, Wrench, XCircle, Settings
} from 'lucide-react';

const PAD = 14;

// 这些 Tab 的核心功能需要登录（token）才能用：未登录时隐藏其切换按钮，登录后再显示。
// 其余 Tab（社区状态 / 作品广场 / 扩展广场 / 登录账户）可匿名访问，始终显示。
const LOGIN_REQUIRED_TABS = new Set([
    'publish',   // 发布作品（POST 需鉴权）
    'disc',      // 发帖/回复（POST 需鉴权）
    'mine',      // 我的作品（rwck.projects.mine，token 门控）
    'drive',     // 我的云盘（personal）
    'res',       // 资源（上传 / 网盘资源需鉴权）
    'social',    // 互动（follow / like / bookmark 等）
    'notify',    // 通知 / 签到（personal）
    'search',    // 搜索（需鉴权或匿名受限）
    'orig',      // 原创登记（POST 需鉴权）
    'cloud',     // 云变量（token 门控）
    'dev'        // 开发者（API 密钥，token 门控）
]);

// ==== 圆角：沿用 forum.ctspace.xyz 的观感；颜色一律来自编辑器主题（见 theme-colors.js） ====
const RADIUS_SM = 6;
const RADIUS_MD = 10;
const RADIUS_LG = 14;

const STYLE = C => ({
    root: {padding: PAD, display:'flex', flexDirection:'column', gap:10, height:'100%', minHeight:0,
           boxSizing:'border-box', fontSize:13, color: C.text,
           background:`linear-gradient(180deg, ${C.surfaceSunken} 0%, ${C.surface} 100%)`},
    titleRow: {display:'flex', alignItems:'center', gap:10, paddingBottom:10,
               borderBottom:`1px solid ${C.border}`},
    brandDot: {width:12, height:12, borderRadius:6, background: C.accent,
               boxShadow:`0 0 0 3px ${C.accentSoft}`},
    tabs: {display:'flex', flexWrap:'wrap', gap:4, padding:'4px 6px', background: C.surfaceAlt,
           borderRadius: RADIUS_MD},
    tab: {padding:'7px 12px', cursor:'pointer', borderRadius: RADIUS_SM,
          border:'none', background:'transparent', fontSize:13, fontWeight:600,
          color: C.textMuted, transition:'all .15s ease', display:'flex', alignItems:'center', gap:6},
    tabActive: {background: C.surfaceRaised, color: C.accent, boxShadow: C.shadowSm},
    body: {flex:1, overflow:'auto', padding:'12px 2px', display:'flex', flexDirection:'column', gap:10,
           scrollbarColor:`${C.scrollbarThumb} transparent`},

    row: {display:'flex', gap:8, alignItems:'center'},
    label: {fontSize:12, color: C.textMuted, minWidth:92, fontWeight:500},
    input: {flex:1, padding:'8px 10px', border:`1px solid ${C.border}`,
            borderRadius: RADIUS_SM, fontSize:13, background: C.inputBackground, color: C.text,
            transition:'border-color .15s ease, box-shadow .15s ease',
            outline:'none'},
    textarea:{flex:1, padding:'8px 10px', border:`1px solid ${C.border}`,
              borderRadius: RADIUS_SM, fontSize:13, minHeight:90, resize:'vertical',
              background: C.inputBackground, color: C.text,
              transition:'border-color .15s ease', outline:'none',
              fontFamily:'inherit'},

    btn: {padding:'8px 14px', borderRadius: RADIUS_SM, border:'none', fontSize:13, fontWeight:600,
          cursor:'pointer', transition:'all .12s ease', outline:'none',
          display:'inline-flex', alignItems:'center', gap:6,
          boxShadow: C.shadowSm},
    btnPrimary: {background: C.accent, color: C.accentText},
    btnGhost:   {background: C.surfaceRaised, border:`1px solid ${C.border}`, color: C.text,
                 boxShadow:'none'},
    btnDanger:  {background: C.danger, color: C.dangerText},
    btnDisabled: {opacity:.55, cursor:'not-allowed', boxShadow:'none', transform:'none !important'},
    btnActive: {transform:'translateY(1px)', boxShadow:'0 1px 0 transparent !important'},
    btnIcon: {padding:'6px 8px', borderRadius: RADIUS_SM},

    box:     {border:`1px solid ${C.border}`, borderRadius: RADIUS_MD,
              padding:12, background: C.surfaceRaised, boxShadow: C.shadowSm},
    card:    {border:`1px solid ${C.border}`, borderRadius: RADIUS_MD,
              padding:12, background: C.surfaceRaised, boxShadow: C.shadowSm},

    captcha: {border:`1px solid ${C.border}`, borderRadius: RADIUS_SM, padding:6,
              background: C.surfaceRaised, height:52, cursor:'pointer', boxShadow:'none'},
    hint:    {fontSize:11, color: C.textSubtle, lineHeight:1.5},
    err:     {color: C.danger, fontSize:12, padding:'8px 10px',
              background: C.dangerSoft, border:`1px solid ${C.dangerBorder}`,
              borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},
    ok:      {color: C.success, fontSize:12, padding:'8px 10px',
              background: C.successSoft, border:`1px solid ${C.successBorder}`,
              borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},
    info:    {color: C.textMuted, fontSize:12, padding:'8px 10px',
              background: C.surfaceAlt, border:`1px solid ${C.border}`,
              borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},

    listItem:{display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
              border:`1px solid ${C.border}`, borderRadius: RADIUS_SM,
              fontSize:13, background: C.surfaceRaised, boxShadow: C.shadowSm},
    switchOn: {background: C.accent},
    switchOff:{background: C.borderStrong},
    avatar:   {width:22, height:22, borderRadius:11, background: C.surfaceAlt},
    fileInfo: {fontSize:11, color: C.textSubtle},
    sectionTitle:{fontSize:11, fontWeight:700, color: C.textMuted,
                  marginTop:6, marginBottom:8, letterSpacing:'.04em',
                  textTransform:'uppercase'},
    subGrid: {display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginTop:8},
    wideGrid:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:10},

    // 社区统计卡片 / 排行榜前三名用的强调色，同样从主题里取
    statColors: [C.accent, C.success, C.warning, C.danger],
    link: {color: C.link, textDecoration:'none', fontWeight:600},

    // 顶部 CORS 警告横幅（黄橙色，不阻塞操作）
    // 编辑器内弹窗
    modalMask: {position:'fixed', left:0, top:0, right:0, bottom:0, zIndex:100000,
                background: C.overlay, display:'flex', alignItems:'center', justifyContent:'center',
                padding:24},
    modalCard: {width:380, maxWidth:'100%', borderRadius: RADIUS_MD, padding:18,
                background: C.surfaceRaised, border:`1px solid ${C.border}`,
                boxShadow: C.shadowLg, display:'flex', flexDirection:'column', gap:12},
    modalTitle: {fontSize:14, fontWeight:700, color: C.text, display:'flex', alignItems:'center', gap:8},
    modalActions: {display:'flex', flexDirection:'column', gap:8, marginTop:4},
    modalRow: {display:'flex', gap:8}
});

const CATEGORIES = [
    {id:'game',     zh:'游戏',   en:'Game'},
    {id:'animation',zh:'动画',   en:'Animation'},
    {id:'story',    zh:'故事',   en:'Story'},
    {id:'music',    zh:'音乐',   en:'Music'},
    {id:'art',      zh:'美术',   en:'Art'},
    {id:'tutorial', zh:'教程',   en:'Tutorial'}
];

/** 论坛网页入口（点按钮直接新标签打开）。 */
const FORUM = {
    home: 'https://forum.ctspace.xyz/',
    works: 'https://forum.ctspace.xyz/works',
    extensions: 'https://forum.ctspace.xyz/extensions',
    login: 'https://forum.ctspace.xyz/?login=1',
    register: 'https://forum.ctspace.xyz/?register=1'
};

function cls (...args) { return Object.assign({}, ...args.filter(Boolean)); }

/** 统一的「错误信息条」。 */
function errBar (S, msg) {
    return msg ? <div style={S.err}><AlertCircle size={12} strokeWidth={2.2} />{msg}</div> : null;
}

/** 统一的「成功信息条」。 */
function okBar (S, msg) {
    return msg ? <div style={S.ok}><CheckCircle size={12} strokeWidth={2.2} />{msg}</div> : null;
}

class RwckPublishPanel extends Component {
    constructor(props) {
        super(props);
        const token = rwck.authState().token;
        // initialTab 来自 open-rwck-publish-window({tab:'community'})
        const initialTab = (props && props.initialTab) || (token ? 'publish' : 'login');

        this.state = {
            tab: initialTab,
            user: rwck.authState().user,

            // ---- 登录 ----
            captcha: null,
            captchaLoading: true,
            captchaLoadErr: '',
            username: '',
            password: '',
            captchaAnswer: '',
            loginBusy: false,
            loginErr: '',

            // ---- 发布作品 ----
            title: '',
            summary: '',
            content: '',
            category: 'game',
            allowDownload: true,
            syncToForum: true,
            sb3File: null,
            sb3ResourceId: null,
            sb3Name: '',
            coverFile: null,
            coverResourceId: null,
            uploadBusy: false,
            uploadProgress: '',
            publishErr: '',
            publishOk: '',

            // ---- 发帖 ----
            discussionTitle: '',
            discussionContent: '',
            discussionBusy: false,
            discussionErr: '',
            discussionOk: '',

            // ---- 我的作品 ----
            myBusy: false,
            myErr: '',
            mine: [],

            // ---- 社区 ----
            statsBusy: false,
            statsErr: '',
            stats: null,
            discussionsPreview: null,
            discussionsErr: '',
            leaderboard: null,
            leaderboardErr: '',
            activeUsers: null,
            activeErr: '',
            settings: null,
            tags: null,
            tagsErr: '',
            onlineCount: null,


            // ---- 回复 ----
            replyDiscussionId: '',
            replyContent: '',
            replyBusy: false,
            replyErr: '',
            replyOk: '',

            termsAcceptedForSession: false,

            // ---- 弹窗 ----
            authModal: null,          // 'login' | 'register' | null
            probeBusy: false,
            probeMsg: '',

            // ---- 作品广场 ----
            worksList: [],
            worksBusy: false,
            worksErr: '',
            worksQ: '',
            worksCategory: '',
            worksSort: 'new',

            // ---- 扩展广场 ----
            extList: [],
            extMine: [],
            extBusy: false,
            extErr: '',
            extOk: '',
            extTitle: '',
            extSummary: '',
            extCategory: 'game',
            extCode: '',

            // ---- 云盘 ----
            driveFiles: [],
            driveUsage: null,
            driveBusy: false,
            driveErr: '',
            driveOk: '',

            // ---- 资源 ----
            resBusy: false,
            resErr: '',
            resOk: '',
            resList: [],
            netdiskLink: '',
            netdiskCode: '',

            // ---- 互动 ----
            commentTargetType: 'project',
            commentTargetId: '',
            commentText: '',
            commentsList: [],
            likeTargetType: 'project',
            likeTargetId: '',
            bookmarkTargetType: 'project',
            bookmarkTargetId: '',
            followUsername: '',
            socialBusy: false,
            socialErr: '',
            socialOk: '',

            // ---- 通知 / 签到 ----
            notifyList: [],
            notifyBusy: false,
            notifyErr: '',
            checkin: null,

            // ---- 搜索 ----
            searchQ: '',
            searchType: 'all',
            searchResult: null,
            searchBusy: false,
            searchErr: '',

            // ---- 原创登记 ----
            origList: [],
            origBusy: false,
            origErr: '',
            origOk: '',
            origCert: '',
            origVerify: null,

            // ---- 云变量 ----
            cloudProjects: [],
            cloudSel: '',
            cloudVars: null,
            cloudHistory: null,
            cloudName: '',
            cloudVarName: '',
            cloudVarValue: '',
            cloudBusy: false,
            cloudErr: '',
            cloudOk: '',

            // ---- 开发者 ----
            devKeys: [],
            devTags: [],
            devLogs: [],
            devBusy: false,
            devErr: '',
            devOk: '',
            newKeyName: '',
            newTagName: ''
        };

        // 把本组件 ref 挂到 openWin 上，让窗口可以 _rwckSwitchTab
        if (props && props._onRef) {
            try { props._onRef(this); } catch (_) {}
        }
    }

    componentDidMount() {
        // 已登录用户若因父级 openRwckPublishWindow 硬指定了 tab:'login'，
        // 由于 visibleTabs 已不包含 login tab，这里必须把 tab 重定向。
        if (this.state.user && this.state.tab === 'login') {
            this.setState({tab: 'community'});
        }
        // 注意：所有 setState 的异步拉取都必须放到挂载之后，
        // 在 constructor 里调会触发 "Can't call setState on a component that is not yet mounted"。
        this._refreshCaptcha();
        // 仅当用户需要这些接口的时候才拉：登录 / community tab 都需要。
        // 社区 tab 是公开的，立即拉。
        this._refreshCommunity();
        this._refreshMine();
    }

    /** 供窗口切换 tab 用（open-rwck-publish-window 可能通过 ref 调）。 */

    /**
     * 警告只在用户真正点击「上传并发布 / 发帖」按钮时弹。
     * 用 sessionStorage 让同一窗口生命周期里只弹一次。
     */
    _ensureTermsAgreed () {
        if (this.state.termsAcceptedForSession) return true;
        const alreadySession = sessionStorage.getItem('rwck:terms-agreed-today');
        if (alreadySession) {
            this.setState({termsAcceptedForSession: true});
            return true;
        }
        const terms = (this.props && this.props.terms) ||
`上传即视为您的作品同意被别人下载。
上传至创客次元社区后，创客次元无法绝对保证您的作品不被别人下载或改编。
请在发布前确认作品内容符合平台社区公约。`;
        const ok = window.confirm('【创客次元上传须知】\n\n' + terms +
            '\n\n点"确定"即表示您已阅读并同意以上条款。\n（同一窗口 / 同一天内只会再提醒一次）');
        if (ok) {
            sessionStorage.setItem('rwck:terms-agreed-today', '1');
            this.setState({termsAcceptedForSession: true});
        }
        return ok;
    }

    /**
     * 拉齐社区面板需要的 6 个公开接口：stats / discussions / leaderboard / active / settings / tags。
     * 点「重新探测」时会先置 probeBusy，界面上给出「正在重新探测…」提示，结束后给出耗时。
     */
    async _refreshCommunity() {
        const latencies = {};
        const t0 = Date.now();
        this.setState({probeBusy: true, probeMsg: '正在重新探测…', statsErr: '',
            discussionsErr: '', leaderboardErr: '', activeErr: '', tagsErr: ''});

        const pStats = rwck.stats.public().then(r => {
            this.setState({stats: r});
            latencies.stats = Date.now();
        }).catch(e => {
            this.setState({statsErr: e.message || '获取社区状态失败'});
        });

        const pDiscs = rwck.discussions.list({page:1, pageSize:8, sort:'new'}).then(r => {
            this.setState({discussionsPreview: rwck.unwrapList(r)});
            latencies.disc = Date.now();
        }).catch(e => {
            this.setState({discussionsErr: e.message || '获取讨论列表失败'});
        });

        const pBoard = rwck.users.leaderboard().then(r => {
            this.setState({leaderboard: Array.isArray(r) ? r.slice(0,10) : (r && Array.isArray(r.items) ? r.items.slice(0,10) : [] )});
        }).catch(e => { this.setState({leaderboardErr: e.message}); });

        const pActive = rwck.users.active().then(r => {
            this.setState({activeUsers: Array.isArray(r) ? r.slice(0,8) : (r && Array.isArray(r.items) ? r.items.slice(0,8) : [])});
        }).catch(e => { this.setState({activeErr: e.message}); });

        const pSettings = rwck.settings.public().then(r => {
            this.setState({settings: r});
        }).catch(() => {});

        const pTags = rwck.tags.list().then(r => {
            this.setState({tags: Array.isArray(r) ? r : (r && r.items) || []});
        }).catch(e => { this.setState({tagsErr: e.message}); });

        const pOnline = rwck.presence.online().then(r => {
            const list = Array.isArray(r) ? r : ((r && (r.items || r.users)) || []);
            this.setState({onlineCount: Array.isArray(list) ? list.length : (r && r.count) || 0});
        }).catch(() => {});

        await Promise.all([pStats, pDiscs, pBoard, pActive, pSettings, pTags, pOnline]);
        this._communityLatencyMs = Date.now() - t0;
        this.setState({
            probeBusy: false,
            probeMsg: this.state.statsErr ? '探测完成，但有接口失败' : `探测完成，耗时 ${this._communityLatencyMs} ms`
        });
    }

    async _refreshStatsOnly() {
        this.setState({statsBusy:true, statsErr:''});
        try {
            const data = await rwck.stats.public();
            this.setState({stats: data, statsBusy:false});
        } catch (e) {
            this.setState({statsErr: this._friendlyError(e), statsBusy:false});
        }
    }

    _friendlyError(e) {
        const msg = (e && (e.message || '')).toLowerCase();
        if (msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('network')) {
            return '网络错误：浏览器无法连接 forum.ctspace.xyz，请检查网络后重试。';
        }
        return (e && e.message) || '未知错误';
    }

    // ========== 验证码 ==========
    async _refreshCaptcha() {
        this.setState({captchaLoading: true, captchaLoadErr: ''});
        try {
            const cap = await rwck.auth.getCaptcha();
            this.setState({captcha: cap, captchaAnswer: '', loginErr: '', captchaLoading: false});
        } catch (e) {
            this.setState({captcha: null, captchaLoading: false,
                           captchaLoadErr: `自动拉取验证码失败：${(e && e.message) || e}。请点右侧刷新按钮重试。`});
        }
    }

    // ========== 登录 ==========
    async _login() {
        const {username, password, captcha, captchaAnswer} = this.state;
        if (!username || !password || !captcha || !captchaAnswer) {
            this.setState({loginErr: '请填完整账号 / 密码 / 验证码'});
            return;
        }
        this.setState({loginBusy:true, loginErr:''});
        try {
            const captchaPowNonce = await rwck.auth.solvePow(captcha.pow);
            const r = await rwck.auth.login({
                username, password,
                captchaToken: captcha.token,
                captchaAnswer,
                captchaPowNonce
            });
            this.setState({user: r.user, tab:'community', loginErr:'', username:'', password:'', captchaAnswer:''});
            this._refreshMine();
        } catch (e) {
            this.setState({loginErr: this._friendlyError(e), loginBusy:false});
            this._refreshCaptcha();
        } finally {
            this.setState({loginBusy:false});
        }
    }

    _logout() {
        rwck.auth.logout();
        this.setState({user:null, tab:'login', publishErr:'', publishOk:''});
    }

    /** 打开「创客次元设置」自由窗口（CORS 代理 + 网络日志）。 */
    _openSettings() {
        if (typeof document === 'undefined') return;
        let WM;
        try { WM = require('../../addons/window-system/window-manager').default; }
        catch (e) { console.warn('[rwck] WindowManager not found:', e); return; }
        const container = document.createElement('div');
        container.style.cssText = 'height:100%;display:flex;flex-direction:column;min-height:0;overflow:auto;';
        const win = WM.createWindow({
            id: 'rwck-settings',
            title: '创客次元设置',
            width: 640, height: 560, minWidth: 520, minHeight: 460,
            onClose: () => { try { ReactDOM.unmountComponentAtNode(container); } catch (_) {} }
        });
        win.setContent(container);
        const colors = this.props.colors || getEditorTheme();
        ReactDOM.render(React.createElement(RwckSettingsPanel, {
            colors,
            getApiClient: () => rwck,
            closeMe: () => { try { win.close(); } catch (_) {} }
        }), container);
        win.center();
        win.show();
    }

    // ========== 作品上传辅助 ==========
    async _loadSb3FromVm () {
        const vm = this.props.getVm && this.props.getVm();
        if (!vm || !vm.saveProjectSb3) {
            this.setState({publishErr:'当前编辑器环境不支持导出 .sb3'});
            return null;
        }
        let blob;
        try {
            const result = await vm.saveProjectSb3();
            blob = result instanceof Blob ? result : new Blob([result], {type:'application/zip'});
        } catch (e) {
            this.setState({publishErr:'读取当前作品失败：' + (e.message||e)});
            return null;
        }
        const projectTitle = this._guessProjectTitle();
        const name = (projectTitle || 'untitled') + '.sb3';
        this.setState({sb3Name: name});
        blob.name = name;
        return blob;
    }

    _guessProjectTitle() {
        try {
            const store = window.ReduxStore;
            if (store) {
                const s = store.getState();
                return (s.scratchGui && s.scratchGui.projectTitle) || '';
            }
        } catch (_) {}
        return '';
    }

    async _pickSb3(e) {
        const f = e.target.files[0];
        if (!f) return;
        this.setState({sb3File:f, sb3ResourceId:null, sb3Name:f.name});
    }

    async _pickCover(e) {
        const f = e.target.files[0];
        if (!f) return;
        this.setState({coverFile:f, coverResourceId:null});
    }

    async _upload() {
        if (!this._ensureTermsAgreed()) return;
        this.setState({uploadBusy:true, publishErr:'', publishOk:'', uploadProgress:'准备中…'});
        try {
            let sb3File = this.state.sb3File;
            if (!sb3File) {
                this.setState({uploadProgress:'从编辑器读取当前作品…'});
                sb3File = await this._loadSb3FromVm();
                if (!sb3File) { this.setState({uploadBusy:false, uploadProgress:''}); return; }
                this.setState({sb3File});
            }

            this.setState({uploadProgress:'上传作品 .sb3…'});
            const sb3 = await rwck.resources.upload(sb3File, this.state.sb3Name);
            this.setState({sb3ResourceId: sb3.id, uploadProgress:'作品上传完成'});

            let coverResourceId = this.state.coverResourceId;
            if (this.state.coverFile) {
                this.setState({uploadProgress:'上传封面…'});
                const cover = await rwck.resources.upload(this.state.coverFile, this.state.coverFile.name);
                coverResourceId = cover.id;
                this.setState({coverResourceId});
            }

            if (!this.state.title) {
                const autoTitle = this._guessProjectTitle() || this.state.sb3Name.replace(/\.sb3$/i,'') || '我的作品';
                this.setState({title: autoTitle});
            }

            this.setState({uploadProgress:'提交作品信息…'});
            const proj = await rwck.projects.create({
                title: this.state.title,
                summary: this.state.summary,
                content: this.state.content,
                category: this.state.category,
                fileResourceId: sb3.id,
                coverResourceId: coverResourceId,
                allowDownload: this.state.allowDownload,
                syncToForum: this.state.syncToForum,
                forumTagIds: []
            });
            this.setState({
                publishOk: `发布成功！作品编号 ${proj.id}，试玩短链 https://forum.ctspace.xyz/g/${proj.shortLinkSlug || ''}`,
                uploadBusy:false, uploadProgress:'', sb3File:null, sb3ResourceId:null, sb3Name:'',
                coverFile:null, coverResourceId:null, title:'', summary:'', content:''
            });
            this._refreshMine();
        } catch (e) {
            this.setState({uploadBusy:false, publishErr: this._friendlyError(e), uploadProgress:''});
        }
    }

    // ========== 发帖 ==========
    async _postDiscussion() {
        if (!this._ensureTermsAgreed()) return;
        const {discussionTitle, discussionContent} = this.state;
        if (!discussionTitle.trim() || !discussionContent.trim()) {
            this.setState({discussionErr:'请填标题和内容', discussionOk:''}); return;
        }
        this.setState({discussionBusy:true, discussionErr:'', discussionOk:''});
        try {
            const d = await rwck.discussions.create({title: discussionTitle, content: discussionContent});
            this.setState({
                discussionOk:`发帖成功！帖子 #${d.seq || d.id}`,
                discussionBusy:false, discussionTitle:'', discussionContent:''
            });
            this._refreshCommunity();
        } catch (e) {
            this.setState({discussionBusy:false, discussionErr: this._friendlyError(e)});
        }
    }

    // ========== 我的作品 ==========
    async _refreshMine() {
        if (!rwck.authState().token) return;
        this.setState({myBusy:true, myErr:''});
        try {
            const r = await rwck.projects.mine();
            this.setState({mine: rwck.unwrapList(r), myBusy:false});
        } catch (e) {
            this.setState({myErr: this._friendlyError(e), myBusy:false});
        }
    }

    // ========== 渲染 ==========
    render() {
        const C = this.props.colors || getEditorTheme();
        const S = STYLE(C);
        const tabs = [
            {id:'login',     icon: LogIn,          label: '登录'},
            {id:'community', icon: BarChart3,      label: '社区状态'},
            {id:'publish',   icon: Upload,         label: '发布作品'},
            {id:'disc',      icon: MessageCircle,  label: '发帖/回复'},
            {id:'mine',      icon: FolderOpen,     label: '我的作品'},
            {id:'works',     icon: Compass,        label: '作品广场'},
            {id:'ext',       icon: Package,        label: '扩展广场'},
            {id:'drive',     icon: HardDrive,      label: '我的云盘'},
            {id:'res',       icon: Layers,         label: '资源'},
            {id:'social',    icon: Users,          label: '互动'},
            {id:'notify',    icon: Bell,           label: '通知/签到'},
            {id:'search',    icon: Search,         label: '搜索'},
            {id:'orig',      icon: ShieldCheck,    label: '原创登记'},
            {id:'cloud',     icon: Database,       label: '云变量'},
            {id:'dev',       icon: Wrench,         label: '开发者'}
        ];
        // 未登录时，只显示可匿名访问的 Tab，登录后才显示需要鉴权的 Tab
        // 已登录：隐藏「登录」Tab（右上角用户栏 + 设置窗口承担所有账号相关入口）。
        // 未登录：按原逻辑只隐藏需鉴权的 Tab。
        const visibleTabs = this.state.user
            ? tabs.filter(t => t.id !== 'login')
            : tabs.filter(t => !LOGIN_REQUIRED_TABS.has(t.id));

        return (
            <div style={S.root}>
                <div style={S.titleRow}>
                    <span style={S.brandDot} />
                    <strong style={{fontSize:15}}>创客次元 · 极光论坛</strong>
                    <span style={{flex:1}} />
                    {this.state.user ? (
                        <span style={{fontSize:12, color: C.textMuted}}>
                            {this.state.user.username}
                            <button style={cls(S.btn, S.btnGhost, {marginLeft:8})}
                                    onClick={()=>this._logout()} title='退出登录'>
                                <LogOut size={14} strokeWidth={2.2} /> 退出
                            </button>
                        </span>
                    ) : null}
                </div>
                    <button style={cls(S.btn, S.btnIcon, S.btnGhost)}
                            title='创客次元设置（CORS 代理 / 网络日志）'
                            onClick={() => this._openSettings()}>
                        <Settings size={16} strokeWidth={2.2} />
                    </button>
                </div>

                {/* 顶部 CORS 横幅已挪到「设置」自由窗口 —— 点右上角齿轮图标打开 */}
                <div style={S.tabs}>
                    {visibleTabs.map(t => (
                        <button key={t.id}
                                style={cls(S.tab, this.state.tab===t.id && S.tabActive)}
                                onClick={()=>this._rwckSwitchTab(t.id)}>
                            <t.icon size={14} strokeWidth={2.2} /> {t.label}
                        </button>
                    ))}
                </div>

                <div style={S.body}>
                    {this._renderTab(S, C)}
                </div>

                {this._renderAuthModal(S, C)}
            </div>
        );
    }
    _renderTab(S, C) {
        const t = this.state.tab;
        // 未登录却处在需鉴权的 Tab：回退到登录视图（该 Tab 按钮此时已被隐藏）
        if (!this.state.user && LOGIN_REQUIRED_TABS.has(t)) return this._renderLogin(S, C);
        if (t === 'community') return this._renderCommunity(S, C);
        if (t === 'login')    return this._renderLogin(S, C);
        if (t === 'publish')  return this._renderPublish(S, C);
        if (t === 'disc')     return this._renderDisc(S, C);
        if (t === 'mine')     return this._renderMine(S, C);
        if (t === 'works')    return this._renderWorks(S, C);
        if (t === 'ext')      return this._renderExt(S, C);
        if (t === 'drive')    return this._renderDrive(S, C);
        if (t === 'res')      return this._renderResources(S, C);
        if (t === 'social')   return this._renderSocial(S, C);
        if (t === 'notify')   return this._renderNotify(S, C);
        if (t === 'search')   return this._renderSearch(S, C);
        if (t === 'orig')     return this._renderOrig(S, C);
        if (t === 'cloud')    return this._renderCloud(S, C);
        if (t === 'dev')      return this._renderDev(S, C);
        return null;
    }

    /** 供窗口切换 tab 时顺带做首次加载。 */
    _rwckSwitchTab (tab) {
        if (tab && ['login','community','publish','disc','mine','works','ext','drive',
            'res','social','notify','search','orig','cloud','dev'].includes(tab)) {
            this.setState({tab});
            this._onTabEnter(tab);
        }
    }

    // ========== 社区状态 ==========
    _renderCommunity(S, C) {
        const primary = C.accent || C.primary;
        const st = this.state.stats;
        const latency = this._communityLatencyMs;
        const discs = this.state.discussionsPreview || [];
        const board = this.state.leaderboard || [];
        const active = this.state.activeUsers || [];
        const tags = this.state.tags || [];

        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {/* 头部：状态行 + 重测 */}
                <div style={cls(S.box, {display:'flex', flexDirection:'column', gap:8})}>
                    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                        <Activity size={16} strokeWidth={2.2} style={{color: this.state.statsErr ? C.danger : primary}} />
                        <strong style={{fontSize:14}}>社区状态</strong>
                        <span style={{flex:1}} />
                        <button style={cls(S.btn, S.btnGhost, this.state.probeBusy && S.btnDisabled)}
                                disabled={this.state.probeBusy}
                                onClick={()=>this._refreshCommunity()}>
                            <RefreshCw size={14} strokeWidth={2.2}
                                       style={{animation: this.state.probeBusy ? 'spin 1s linear infinite' : 'none'}} />
                            {this.state.probeBusy ? '正在探测…' : '重新探测'}
                        </button>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center', fontSize:12}}>
                        {this.state.probeMsg && !this.state.statsErr && (
                            <span style={{color: C.textMuted}}>{this.state.probeMsg}</span>
                        )}
                        {latency != null && !this.state.statsErr && !this.state.probeBusy && (
                            <span style={{color: C.success}}>
                                <CheckCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                连通，耗时 {latency} ms
                            </span>
                        )}
                        {this.state.statsErr && (
                            <span style={{color: C.danger}}>
                                <AlertCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                {this._friendlyError(this.state.statsErr)}
                            </span>
                        )}
                        {!latency && !this.state.statsErr && !this.state.statsBusy && (
                            <span style={{color: C.textMuted}}>正在获取…</span>
                        )}
                    </div>
                </div>

                {/* 核心指标 */}
                {st && (
                    <div style={cls(S.box, {padding:14})}>
                        <div style={S.sectionTitle}>站点总览</div>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
                            {[
                                {label:'注册用户',   value: st.users || 0,        icon: Users},
                                {label:'帖子总数',   value: st.posts || 0,        icon: MessageCircle},
                                {label:'讨论串',     value: st.discussions || 0,  icon: BookOpen},
                                {label:'今日访问',   value: st.todayVisits || 0,  icon: Activity}
                            ].map((c, i) => (
                                <div key={i} style={{
                                    border:`1px solid ${C.border}`, borderRadius: RADIUS_MD,
                                    padding:10, textAlign:'center', background: C.surfaceRaised,
                                    boxShadow: C.shadowSm
                                }}>
                                    <c.icon size={18} strokeWidth={2.2}
                                            style={{color: S.statColors[i % S.statColors.length], marginBottom:4}} />
                                    <div style={{fontSize:20, fontWeight:700, color: primary}}>{c.value}</div>
                                    <div style={{fontSize:11, color: C.textMuted}}>{c.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {this.state.onlineCount != null && (
                    <div style={cls(S.box, {display:'flex', gap:8, alignItems:'center', padding:10})}>
                        <Activity size={14} strokeWidth={2.2} style={{color: C.success}} />
                        <span style={{fontSize:12}}>当前在线 {this.state.onlineCount} 人</span>
                    </div>
                )}

                {/* 两栏：最新讨论 + 活跃用户 / 排行榜 */}
                <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:10}}>
                    {/* 最新讨论 */}
                    <div style={S.box}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                            <div style={S.sectionTitle}>最新讨论</div>
                            <a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'
                               style={{...S.hint, ...S.link}}>
                                查看全部 →
                            </a>
                        </div>
                        {this.state.discussionsErr && <div style={S.err}>{this.state.discussionsErr}</div>}
                        {!this.state.discussionsErr && (!discs || discs.length === 0) && (
                            <div style={S.hint}>暂无讨论，<a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'>去发第一个吧 →</a></div>
                        )}
                        <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {discs.slice(0, 8).map((d, i) => {
                                const author = d.author || {nickname: null, username: '匿名', avatar: null};
                                return (
                                    <a key={d.id || i}
                                       href={`https://forum.ctspace.xyz/d/${d.seq || ''}`}
                                       target='_blank' rel='noreferrer'
                                       style={{...S.listItem, textDecoration:'none', color:'inherit', padding:'8px 10px'}}>
                                        <div style={{flex:'0 0 auto', width:24, fontSize:13, fontWeight:700,
                                                      color: i<3 ? primary : C.textSubtle}}>#{d.seq || i+1}</div>
                                        {author.avatar && (
                                            <img src={author.avatar} alt='' style={{width:26, height:26, borderRadius:13, border:`1px solid ${C.border}`}} />
                                        )}
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontWeight:600, fontSize:13, color: C.text,
                                                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                                {d.title}
                                            </div>
                                            <div style={{...S.hint, marginTop:2}}>
                                                由 <b>{author.nickname || author.username || '匿名'}</b>
                                                · <span style={{color: C.textMuted}}>{this._fmtTime(d.createdAt)}</span>
                                            </div>
                                        </div>
                                        <span style={{fontSize:11, color: C.textSubtle, whiteSpace:'nowrap'}}>
                                            <MessageCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color: C.textSubtle}} /> {d.postCount || 0}
                                        </span>
                                        <span style={{fontSize:11, color: C.textSubtle, whiteSpace:'nowrap'}}>
                                            <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color: C.textSubtle}} /> {d.views || 0}
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* 活跃用户 / 排行榜 */}
                    <div style={{display:'flex', flexDirection:'column', gap:10}}>
                        <div style={S.box}>
                            <div style={S.sectionTitle}>排行榜</div>
                            {this.state.leaderboardErr && <div style={S.hint}>加载失败</div>}
                            {!this.state.leaderboardErr && board.length === 0 && <div style={S.hint}>暂无数据</div>}
                            {board.slice(0, 5).map((u, i) => (
                                <div key={u.id || i}
                                     style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
                                             fontSize:13, borderBottom:`1px dashed ${C.border}`}}>
                                    <span style={{width:18, fontWeight:700, color: i<3 ? primary : C.textSubtle}}>#{i+1}</span>
                                    {u.avatar && (
                                        <img src={u.avatar} alt='' style={{width:22, height:22, borderRadius:11, border:`1px solid ${C.border}`}} />
                                    )}
                                    <span style={{flex:1, fontWeight:600}}>
                                        {u.nickname || u.username || '匿名'}
                                    </span>
                                    <span style={{fontSize:11, color: C.textMuted}}>
                                        +{(u.points ?? u.score ?? 0)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={S.box}>
                            <div style={S.sectionTitle}>活跃用户</div>
                            {this.state.activeErr && <div style={S.hint}>加载失败</div>}
                            {!this.state.activeErr && active.length === 0 && <div style={S.hint}>暂无数据</div>}
                            <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                                {active.slice(0, 6).map((u, i) => (
                                    <a key={u.id || i}
                                       href={`https://forum.ctspace.xyz/u/${u.username || ''}`}
                                       target='_blank' rel='noreferrer'
                                       style={{padding:'4px 8px', border:`1px solid ${C.border}`,
                                               borderRadius:12, fontSize:11, color: C.text,
                                               textDecoration:'none', display:'inline-flex', gap:4,
                                               alignItems:'center', background: C.surfaceRaised}}>
                                        {u.avatar && <img src={u.avatar} alt='' style={{width:14, height:14, borderRadius:7}} />}
                                        {u.nickname || u.username || '匿名'}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {tags && tags.length > 0 && (
                            <div style={S.box}>
                                <div style={S.sectionTitle}>热门标签</div>
                                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                                    {tags.slice(0, 10).map((t, i) => (
                                        <a key={t.id || i}
                                           href={`https://forum.ctspace.xyz/tag/${t.slug || t.id || ''}`}
                                           target='_blank' rel='noreferrer'
                                           style={{padding:'3px 8px', borderRadius:12, fontSize:11,
                                                   background: C.accentSoft, color: primary,
                                                   textDecoration:'none', border:`1px solid ${C.accentBorder}`}}>
                                            #{t.name || t.slug || t.title || `tag${i+1}`}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 站内入口：前三个直接新标签打开，登录 / 注册先弹编辑器内选择 */}
                <div style={cls(S.box, {display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'})}>
                    {[
                        {key:'home',  icon: Globe,       text: '访问论坛首页', href: FORUM.home},
                        {key:'works', icon: FolderOpen,  text: '作品广场',     href: FORUM.works},
                        {key:'ext',   icon: Package,     text: '扩展广场',     href: FORUM.extensions}
                    ].map(item => (
                        <a key={item.key}
                           href={item.href} target='_blank' rel='noreferrer'
                           style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                            <item.icon size={14} strokeWidth={2.2} /> {item.text}
                        </a>
                    ))}
                    <button style={cls(S.btn, S.btnPrimary)}
                            onClick={()=>this.setState({authModal:'login'})}>
                        <LogIn size={14} strokeWidth={2.2} /> 登录
                    </button>
                    <button style={cls(S.btn, S.btnGhost)}
                            onClick={e => { e.preventDefault(); window.open('https://forum.ctspace.xyz/?register=1','_blank','noopener,noreferrer'); }}>
                        <UserPlus size={14} strokeWidth={2.2} /> 注册
                    </button>
                </div>
            </div>
        );
    }

    /** 登录入口弹窗：选择在编辑器内登录还是跳到论坛网页。 */
    _renderAuthModal(S, C) {
        if (this.state.authModal !== 'login') return null;

        return (
            <div style={S.modalMask}
                 onClick={()=>this.setState({authModal:null})}>
                <div style={S.modalCard}
                     onClick={e=>e.stopPropagation()}>
                    <div style={S.modalTitle}>
                        <LogIn size={16} strokeWidth={2.2} />
                        登录创客次元
                    </div>
                    <div style={S.hint}>
                        想在哪里登录？在编辑器内可以直接填账号密码；
                        也可以跳到论坛网页登录（会带好对应入口参数）。
                    </div>
                    <div style={S.modalActions}>
                        <button style={cls(S.btn, S.btnPrimary)}
                                onClick={()=>this.setState({authModal:null, tab:'login'})}>
                            <LogIn size={14} strokeWidth={2.2} /> 在编辑器内登录
                        </button>
                        <a href={FORUM.login} target='_blank' rel='noreferrer'
                           style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}
                           onClick={()=>this.setState({authModal:null})}>
                            <ExternalLink size={14} strokeWidth={2.2} /> 在论坛中登录
                        </a>
                    </div>
                    <div style={S.modalRow}>
                        <button style={cls(S.btn, S.btnGhost, {marginLeft:'auto'})}
                                onClick={()=>this.setState({authModal:null})}>
                            取消
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    _fmtTime(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const now = Date.now();
            const diff = (now - d.getTime()) / 1000;
            if (diff < 60) return '刚刚';
            if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
            if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
            if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
            return d.toLocaleDateString();
        } catch { return iso; }
    }

    // ========== 登录 ==========
    _renderLogin(S, C) {
        const {captcha} = this.state;
        const hasImage = !!captcha;
        const loginDisabled = this.state.loginBusy || !this.state.username || !this.state.password
                              || !captcha || !this.state.captchaAnswer;

        return (
            <div style={{position:'relative', display:'flex', flexDirection:'column', gap:10}}>
            <div style={S.box}>
                <div style={S.sectionTitle}>登录</div>
                <div style={S.hint}>首次使用请先去官网注册账号（需验证邮箱）。登录会先通过图形验证码 + 前端自动计算的 PoW 工作量证明。</div>
                {this.state.loginErr && <div style={S.err}>{this.state.loginErr}</div>}
                {this.state.loginBusy && <div style={S.ok}>登录中…</div>}

                <div style={S.row}>
                    <label style={S.label}>用户名 / 邮箱</label>
                    <input style={S.input} value={this.state.username}
                           onChange={e=>this.setState({username:e.target.value})} autoComplete='username' />
                </div>
                <div style={S.row}>
                    <label style={S.label}>密码</label>
                    <input style={S.input} type='password' value={this.state.password}
                           onChange={e=>this.setState({password:e.target.value})} autoComplete='current-password' />
                </div>

                <div style={S.row}>
                    <label style={S.label}>图形验证码</label>
                    <div style={{...S.captcha, display:'flex', alignItems:'center', justifyContent:'center',
                                  minWidth:140, color: C.textSubtle, fontSize:12}}>
                        {this.state.captchaLoading ? '正在加载…'
                         : hasImage ? (
                            <img alt='captcha' style={{borderRadius:4, height:40, cursor:'pointer'}}
                                 src={captcha.image}
                                 onClick={()=>this._refreshCaptcha()}
                                 title='点一下刷新' />
                         ) : '等待加载'}
                    </div>

                    <input style={{...S.input, maxWidth:150}} value={this.state.captchaAnswer}
                           onChange={e=>this.setState({captchaAnswer:e.target.value})}
                           placeholder={hasImage ? '输入图中字符' : '先获取验证码'}
                           maxLength={8} disabled={!hasImage} />

                    <button style={cls(S.btn, S.btnGhost, this.state.captchaLoading && S.btnDisabled)}
                            onClick={()=>this._refreshCaptcha()}
                            disabled={this.state.captchaLoading}
                            title='重新获取验证码'>
                        <RefreshCw size={14} strokeWidth={2.2}
                                   style={{animation: this.state.captchaLoading ? 'spin 1s linear infinite' : 'none'}} />
                    </button>
                </div>

                {this.state.captchaLoadErr && !hasImage && (
                    <div style={{...S.err, marginTop:6}}>{this.state.captchaLoadErr}</div>
                )}

                <div style={{...S.row, paddingLeft:90, marginTop:6}}>
                    <button style={cls(S.btn, S.btnPrimary, loginDisabled && S.btnDisabled)}
                            disabled={loginDisabled}
                            onClick={()=>this._login()}>
                        <LogIn size={14} strokeWidth={2.2} /> {this.state.loginBusy ? '登录中…' : '登录'}
                    </button>
                    <span style={S.hint}>PoW 会在点击登录时自动计算（几毫秒）</span>
                </div>
            </div>
            <div style={S.box}>
                <div style={S.hint}>
                    还没有账号？注册需要转到社区官网
                    <a href='https://forum.ctspace.xyz/?register=1'
                       target='_blank' rel='noreferrer'
                       style={{...S.link, marginLeft:3}}>https://forum.ctspace.xyz/?register=1</a>
                    页面注册。
                </div>
            </div>
            <div style={{height:44}} />
            {/* 登录页右下角设置入口（未登录时显示，已登录通过顶部设置按钮进入） */}
            {!this.state.user && (
                <button style={{
                    position:'absolute', right:12, bottom:12, zIndex:50,
                    padding:'7px 12px', borderRadius:18, border:'none',
                    background:C.accent, color:'#fff', cursor:'pointer',
                    font:'12px/1.2 system-ui,sans-serif', boxShadow:S.shadowSm,
                    display:'inline-flex', gap:6, alignItems:'center'
                }}
                        onClick={() => this._openSettings()}>
                    <Settings size={13} strokeWidth={2.2} /> 设置
                </button>
            )}
            </div>
        );
    }

    _renderPublish(S, C) {
        const catLabel = c => `${c.zh} / ${c.en}`;
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.hint}>
                        <AlertCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color: C.warning}} />
                        发布前确认作品内容符合社区公约。上传即视为您的作品同意被别人下载。
                    </div>
                </div>
                {this.state.publishErr && <div style={S.err}>{this.state.publishErr}</div>}
                {this.state.publishOk  && <div style={S.ok}>{this.state.publishOk}</div>}

                <div style={S.sectionTitle}>作品信息</div>
                <div style={S.row}>
                    <label style={S.label}>标题 *</label>
                    <input style={S.input} value={this.state.title}
                           onChange={e=>this.setState({title:e.target.value})}
                           placeholder='默认从当前编辑器作品名取' />
                </div>
                <div style={S.row}>
                    <label style={S.label}>分类</label>
                    <select style={S.input} value={this.state.category}
                            onChange={e=>this.setState({category:e.target.value})}>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}
                    </select>
                </div>
                <div style={S.row}>
                    <label style={S.label}>简介</label>
                    <input style={S.input} value={this.state.summary}
                           onChange={e=>this.setState({summary:e.target.value})}
                           placeholder='一句话简介，可选，≤500 字' />
                </div>
                <div style={S.row}>
                    <label style={S.label}>正文（Markdown）</label>
                    <textarea style={S.textarea} value={this.state.content}
                              onChange={e=>this.setState({content:e.target.value})}
                              placeholder='详细介绍、玩法说明、更新日志……' />
                </div>

                <div style={S.sectionTitle}>文件</div>
                <div style={S.row}>
                    <label style={S.label}>.sb3 作品</label>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadSb3FromVm()}>
                        <FileCode size={14} strokeWidth={2.2} /> 从编辑器读取
                    </button>
                    <span style={S.fileInfo}>或</span>
                    <label style={cls(S.btn, S.btnGhost)}>
                        手动选择
                        <input type='file' accept='.sb3' style={{display:'none'}}
                               onChange={e=>this._pickSb3(e)} />
                    </label>
                    {this.state.sb3Name && <span style={S.fileInfo}>已选：{this.state.sb3Name}</span>}
                </div>
                <div style={S.row}>
                    <label style={S.label}>封面图（可选）</label>
                    <label style={cls(S.btn, S.btnGhost)}>
                        选择图片
                        <input type='file' accept='image/*' style={{display:'none'}}
                               onChange={e=>this._pickCover(e)} />
                    </label>
                    {this.state.coverFile && <span style={S.fileInfo}>已选：{this.state.coverFile.name}</span>}
                </div>

                <div style={S.sectionTitle}>其它</div>
                <div style={S.row}>
                    <label style={S.label}>允许他人下载</label>
                    <input type='checkbox' checked={this.state.allowDownload}
                           onChange={e=>this.setState({allowDownload:e.target.checked})} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>同步到论坛帖子</label>
                    <input type='checkbox' checked={this.state.syncToForum}
                           onChange={e=>this.setState({syncToForum:e.target.checked})} />
                </div>

                {this.state.uploadProgress && <div style={S.ok}>{this.state.uploadProgress}</div>}
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnPrimary, this.state.uploadBusy && S.btnDisabled)}
                            disabled={this.state.uploadBusy}
                            onClick={()=>this._upload()}>
                        <Upload size={14} strokeWidth={2.2} /> {this.state.uploadBusy ? '上传中…' : '上传并发布'}
                    </button>
                    <span style={S.fileInfo}>
                        {this.state.sb3ResourceId ? '作品已上传' : this.state.sb3File ? '将以上传选中文件' : '将导出当前编辑器作品'}
                    </span>
                </div>
            </div>
        );
    }

    _renderDisc(S) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.hint}>发帖限流 4 条/小时。正文支持 Markdown，可引用云盘资源。</div>
                </div>
                {this.state.discussionErr && <div style={S.err}>{this.state.discussionErr}</div>}
                {this.state.discussionOk  && <div style={S.ok}>{this.state.discussionOk}</div>}
                <div style={S.row}>
                    <label style={S.label}>标题 *</label>
                    <input style={S.input} value={this.state.discussionTitle}
                           onChange={e=>this.setState({discussionTitle:e.target.value})} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>正文 *</label>
                    <textarea style={S.textarea} value={this.state.discussionContent}
                              onChange={e=>this.setState({discussionContent:e.target.value})} />
                </div>
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnPrimary, this.state.discussionBusy && S.btnDisabled)}
                            disabled={this.state.discussionBusy}
                            onClick={()=>this._postDiscussion()}>
                        {this.state.discussionBusy ? '发帖中…' : '发布帖子'}
                    </button>
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>回复已有讨论（POST /posts）</div>
                    <div style={S.row}>
                        <label style={S.label}>讨论 ID</label>
                        <input style={S.input} value={this.state.replyDiscussionId}
                               onChange={e=>this.setState({replyDiscussionId: e.target.value})}
                               placeholder='例如 123' />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>回复内容</label>
                        <textarea style={S.textarea} value={this.state.replyContent}
                                  onChange={e=>this.setState({replyContent: e.target.value})} />
                    </div>
                    {errBar(S, this.state.replyErr)}
                    {okBar(S, this.state.replyOk)}
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnPrimary, this.state.replyBusy && S.btnDisabled)}
                                disabled={this.state.replyBusy}
                                onClick={()=>this._postReply()}>
                            <Send size={14} strokeWidth={2.2} /> 回复
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /** 回复某条讨论（POST /posts）。 */
    async _postReply() {
        const {replyDiscussionId, replyContent} = this.state;
        if (!replyDiscussionId.trim() || !replyContent.trim()) {
            this.setState({replyErr: '讨论 ID 和回复内容都要填'});
            return;
        }
        this.setState({replyBusy: true, replyErr: '', replyOk: ''});
        try {
            await rwck.posts.create({discussionId: replyDiscussionId, content: replyContent});
            this.setState({replyBusy: false, replyOk: '回复已发布', replyContent: ''});
        } catch (e) {
            this.setState({replyErr: this._friendlyError(e), replyBusy: false});
        }
    }

    _renderMine(S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>我发布的作品</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._refreshMine()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                </div>
                {this.state.myErr && <div style={S.err}>{this.state.myErr}</div>}
                {this.state.myBusy && <div style={S.ok}>加载中…</div>}
                {!this.state.myBusy && this.state.mine.length === 0 && (
                    <div style={S.hint}>还没有发布过作品，快去「发布作品」Tab 发第一个吧～</div>
                )}
                {this.state.mine.map(p => (
                    <div key={p.id} style={S.listItem}>
                        <span style={{flex:1, minWidth:0, fontSize:13}}>
                            <span style={{fontWeight:600}}>{p.title}</span>
                            <span style={{color: C.textSubtle, fontSize:11, marginLeft:6}}>({p.category})</span>
                        </span>
                        <span style={{fontSize:11, color: C.textSubtle}}>
                            <Heart size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color: C.textSubtle}} /> {p.likeCount||0}
                            · <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color: C.textSubtle}} /> {p.views||0}
                        </span>
                        {p.shortLinkSlug && (
                            <a href={`https://forum.ctspace.xyz/g/${p.shortLinkSlug}`} target='_blank' rel='noreferrer'
                               style={{...S.link, fontSize:11}}>试玩</a>
                        )}
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)}
                                title='删除作品'
                                onClick={()=>this._removeProject(p.id)}>
                            <Trash2 size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    async _removeProject (id) {
        if (!window.confirm(`确定删除作品 #${id}？此操作不可撤销。`)) return;
        try {
            await rwck.projects.remove(id);
            this._refreshMine();
        } catch (e) {
            this.setState({myErr: this._friendlyError(e)});
        }
    }

    // ========== Tab 懒加载 ==========
    _onTabEnter (tab) {
        if (tab === 'works')  this._loadWorks();
        if (tab === 'ext')   { this._loadExt(); this._loadExtMine(); }
        if (tab === 'drive')  this._loadDrive();
        if (tab === 'res')    this._loadResources();
        if (tab === 'notify') { this._loadNotify(); this._loadCheckin(); }
        if (tab === 'orig')   this._loadOrig();
        if (tab === 'cloud')  this._loadCloud();
        if (tab === 'dev')    this._loadDev();
    }

    // ========== 作品广场 ==========
    async _loadWorks () {
        this.setState({worksBusy: true, worksErr: ''});
        try {
            const r = await rwck.projects.list({
                q: this.state.worksQ || undefined,
                category: this.state.worksCategory || undefined,
                sort: this.state.worksSort,
                page: 1,
                pageSize: 20
            });
            this.setState({worksList: rwck.unwrapList(r), worksBusy: false});
        } catch (e) {
            this.setState({worksErr: this._friendlyError(e), worksBusy: false});
        }
    }

    async _likeProject (id) {
        try {
            await rwck.projects.toggleLike(id);
            this._loadWorks();
        } catch (e) {
            this.setState({worksErr: this._friendlyError(e)});
        }
    }

    _renderWorks (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.row}>
                    <input style={S.input} placeholder='搜索作品标题…' value={this.state.worksQ}
                           onChange={e=>this.setState({worksQ: e.target.value})} />
                    <select style={{...S.input, flex:'0 0 130px'}} value={this.state.worksCategory}
                            onChange={e=>this.setState({worksCategory: e.target.value})}>
                        <option value=''>全部分类</option>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.zh}</option>)}
                    </select>
                    <select style={{...S.input, flex:'0 0 110px'}} value={this.state.worksSort}
                            onChange={e=>this.setState({worksSort: e.target.value})}>
                        <option value='new'>最新</option>
                        <option value='score'>最热</option>
                    </select>
                    <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._loadWorks()}>
                        <Search size={14} strokeWidth={2.2} /> 搜索
                    </button>
                </div>
                {errBar(S, this.state.worksErr)}
                {this.state.worksBusy && <div style={S.ok}>加载中…</div>}
                {!this.state.worksBusy && this.state.worksList.length === 0 && (
                    <div style={S.hint}>没有找到作品</div>
                )}
                {this.state.worksList.map((p, i) => (
                    <div key={p.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>
                            <span style={{fontWeight:600}}>{p.title}</span>
                            <span style={{color: C.textSubtle, fontSize:11, marginLeft:6}}>
                                {p.category} · {p.author && (p.author.nickname || p.author.username) || '匿名'}
                            </span>
                        </span>
                        <span style={{fontSize:11, color: C.textSubtle}}>
                            <Heart size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} /> {p.likeCount || 0}
                            · <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} /> {p.views || 0}
                        </span>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='点赞 / 取消点赞'
                                onClick={()=>this._likeProject(p.id)}>
                            <ThumbsUp size={13} strokeWidth={2.2} />
                        </button>
                        {p.shortLinkSlug && (
                            <a href={`https://forum.ctspace.xyz/g/${p.shortLinkSlug}`} target='_blank' rel='noreferrer'
                               style={{...S.link, fontSize:11}}>试玩</a>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // ========== 扩展广场 ==========
    async _loadExt () {
        this.setState({extBusy: true, extErr: ''});
        try {
            const r = await rwck.extensions.list({page: 1, pageSize: 30});
            this.setState({extList: rwck.unwrapList(r), extBusy: false});
        } catch (e) {
            this.setState({extErr: this._friendlyError(e), extBusy: false});
        }
    }

    async _loadExtMine () {
        if (!rwck.authState().token) return;
        try {
            const r = await rwck.extensions.my();
            this.setState({extMine: rwck.unwrapList(r)});
        } catch (_) { /* 未登录时忽略 */ }
    }

    async _createExt () {
        const {extTitle, extSummary, extCategory, extCode} = this.state;
        if (!extTitle.trim() || !extCode.trim()) {
            this.setState({extErr: '标题和代码都要填'});
            return;
        }
        this.setState({extBusy: true, extErr: '', extOk: ''});
        try {
            await rwck.extensions.create({
                title: extTitle, summary: extSummary, category: extCategory,
                code: extCode, license: 'mit'
            });
            this.setState({extBusy: false, extOk: '扩展已发布', extTitle: '', extSummary: '', extCode: ''});
            this._loadExtMine();
        } catch (e) {
            this.setState({extErr: this._friendlyError(e), extBusy: false});
        }
    }

    async _removeExt (id) {
        if (!window.confirm(`确定删除扩展 #${id}？`)) return;
        try {
            await rwck.extensions.remove(id);
            this._loadExtMine();
        } catch (e) {
            this.setState({extErr: this._friendlyError(e)});
        }
    }

    async _likeExt (id) {
        try {
            await rwck.extensions.toggleLike(id);
            this._loadExt();
        } catch (e) {
            this.setState({extErr: this._friendlyError(e)});
        }
    }

    _renderExt (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>发布扩展</div>
                    <div style={S.row}>
                        <label style={S.label}>标题 *</label>
                        <input style={S.input} value={this.state.extTitle}
                               onChange={e=>this.setState({extTitle: e.target.value})} />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>简介</label>
                        <input style={S.input} value={this.state.extSummary}
                               onChange={e=>this.setState({extSummary: e.target.value})} />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>分类</label>
                        <select style={S.input} value={this.state.extCategory}
                                onChange={e=>this.setState({extCategory: e.target.value})}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.zh}</option>)}
                        </select>
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>源码 *</label>
                        <textarea style={S.textarea} value={this.state.extCode}
                                  onChange={e=>this.setState({extCode: e.target.value})}
                                  placeholder='Scratch 扩展的 JS 源码…' />
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={cls(S.btn, S.btnPrimary, this.state.extBusy && S.btnDisabled)}
                                disabled={this.state.extBusy}
                                onClick={()=>this._createExt()}>
                            <Plus size={14} strokeWidth={2.2} /> 发布扩展
                        </button>
                    </div>
                </div>
                {errBar(S, this.state.extErr)}
                {okBar(S, this.state.extOk)}

                <div style={S.sectionTitle}>全部扩展</div>
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadExt()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                </div>
                {this.state.extList.map((x, i) => (
                    <div key={x.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>
                            <span style={{fontWeight:600}}>{x.title}</span>
                            <span style={{color: C.textSubtle, fontSize:11, marginLeft:6}}>{x.category}</span>
                        </span>
                        <a href={rwck.extensions.rawUrl(x.id)} target='_blank' rel='noreferrer'
                           style={{...S.link, fontSize:11}}>源码</a>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='点赞'
                                onClick={()=>this._likeExt(x.id)}>
                            <ThumbsUp size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}

                {this.state.extMine.length > 0 && (
                    <React.Fragment>
                        <div style={S.sectionTitle}>我发布的扩展</div>
                        {this.state.extMine.map((x, i) => (
                            <div key={x.id || i} style={S.listItem}>
                                <span style={{flex:1, fontWeight:600}}>{x.title}</span>
                                <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='删除'
                                        onClick={()=>this._removeExt(x.id)}>
                                    <Trash2 size={13} strokeWidth={2.2} />
                                </button>
                            </div>
                        ))}
                    </React.Fragment>
                )}
            </div>
        );
    }

    // ========== 我的云盘 ==========
    async _loadDrive () {
        this.setState({driveBusy: true, driveErr: ''});
        try {
            const [files, usage] = await Promise.all([rwck.drive.files(), rwck.drive.usage()]);
            this.setState({driveFiles: rwck.unwrapList(files), driveUsage: usage, driveBusy: false});
        } catch (e) {
            this.setState({driveErr: this._friendlyError(e), driveBusy: false});
        }
    }

    async _uploadDrive (e) {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        this.setState({driveBusy: true, driveErr: '', driveOk: ''});
        try {
            await rwck.drive.upload(f, f.name);
            this.setState({driveOk: `已上传 ${f.name}`, driveBusy: false});
            this._loadDrive();
        } catch (err) {
            this.setState({driveErr: this._friendlyError(err), driveBusy: false});
        }
    }

    async _removeDriveFile (id) {
        if (!window.confirm('确定删除这个文件？')) return;
        try {
            await rwck.drive.remove(id);
            this._loadDrive();
        } catch (e) {
            this.setState({driveErr: this._friendlyError(e)});
        }
    }

    _renderDrive (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.row}>
                    <label style={cls(S.btn, S.btnGhost)}>
                        <Upload size={14} strokeWidth={2.2} /> 上传到云盘
                        <input type='file' style={{display:'none'}} onChange={e=>this._uploadDrive(e)} />
                    </label>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadDrive()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                    {this.state.driveUsage && (
                        <span style={S.fileInfo}>
                            已用 {this.state.driveUsage.used ?? this.state.driveUsage.usedBytes ?? '?'} /
                            {this.state.driveUsage.total ?? this.state.driveUsage.totalBytes ?? '?'}
                        </span>
                    )}
                </div>
                {errBar(S, this.state.driveErr)}
                {okBar(S, this.state.driveOk)}
                {this.state.driveBusy && <div style={S.ok}>处理中…</div>}
                {this.state.driveFiles.map((f, i) => (
                    <div key={f.id || i} style={S.listItem}>
                        <FileText size={14} strokeWidth={2.2} style={{color: C.textSubtle}} />
                        <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {f.name || f.filename}
                        </span>
                        {f.shareId && (
                            <a href={rwck.drive.rawUrl(f.shareId)} target='_blank' rel='noreferrer'
                               style={{...S.link, fontSize:11}}>直链</a>
                        )}
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='删除'
                                onClick={()=>this._removeDriveFile(f.id)}>
                            <Trash2 size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 资源 ==========
    async _loadResources () {
        this.setState({resBusy: true, resErr: ''});
        try {
            const r = await rwck.resources.rewarded();
            this.setState({resList: rwck.unwrapList(r), resBusy: false});
        } catch (e) {
            this.setState({resErr: this._friendlyError(e), resBusy: false});
        }
    }

    async _uploadResource (e) {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        this.setState({resBusy: true, resErr: '', resOk: ''});
        try {
            const r = await rwck.resources.upload(f, f.name);
            this.setState({resOk: `已上传，资源 ID ${r.id}`, resBusy: false});
        } catch (err) {
            this.setState({resErr: this._friendlyError(err), resBusy: false});
        }
    }

    async _addNetdisk () {
        const {netdiskLink, netdiskCode} = this.state;
        if (!netdiskLink.trim()) {
            this.setState({resErr: '请填网盘链接'});
            return;
        }
        this.setState({resBusy: true, resErr: '', resOk: ''});
        try {
            await rwck.resources.netdisk({
                provider: 'other',
                link: netdiskLink,
                extractCode: netdiskCode,
                requireLogin: false,
                requireReward: false
            });
            this.setState({resOk: '网盘资源已登记', resBusy: false, netdiskLink: '', netdiskCode: ''});
        } catch (e) {
            this.setState({resErr: this._friendlyError(e), resBusy: false});
        }
    }

    _renderResources (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>上传资源</div>
                    <div style={S.row}>
                        <label style={cls(S.btn, S.btnGhost)}>
                            <Upload size={14} strokeWidth={2.2} /> 选择文件
                            <input type='file' style={{display:'none'}} onChange={e=>this._uploadResource(e)} />
                        </label>
                        <span style={S.fileInfo}>上传后可作为附件引用（resources/{'{id}'}）</span>
                    </div>
                </div>
                <div style={S.box}>
                    <div style={S.sectionTitle}>登记网盘资源</div>
                    <div style={S.row}>
                        <label style={S.label}>链接</label>
                        <input style={S.input} value={this.state.netdiskLink}
                               onChange={e=>this.setState({netdiskLink: e.target.value})}
                               placeholder='https://pan.xxx.com/s/…' />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>提取码</label>
                        <input style={S.input} value={this.state.netdiskCode}
                               onChange={e=>this.setState({netdiskCode: e.target.value})} />
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._addNetdisk()}>
                            <Plus size={14} strokeWidth={2.2} /> 登记
                        </button>
                    </div>
                </div>
                {errBar(S, this.state.resErr)}
                {okBar(S, this.state.resOk)}
                <div style={S.sectionTitle}>已获赏资源</div>
                {this.state.resList.map((r, i) => (
                    <div key={r.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>{r.name || r.filename || `资源 ${r.id}`}</span>
                        <a href={`https://forum.ctspace.xyz/r/${r.id}`} target='_blank' rel='noreferrer'
                           style={{...S.link, fontSize:11}}>打开</a>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 互动（评论 / 点赞 / 表态 / 收藏 / 关注） ==========
    async _loadComments () {
        const {commentTargetType, commentTargetId} = this.state;
        if (!commentTargetId) {
            this.setState({socialErr: '请填目标 ID'});
            return;
        }
        this.setState({socialBusy: true, socialErr: ''});
        try {
            const r = await rwck.comments.list(commentTargetType, commentTargetId);
            this.setState({commentsList: rwck.unwrapList(r), socialBusy: false});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    async _postComment () {
        const {commentTargetType, commentTargetId, commentText} = this.state;
        if (!commentTargetId || !commentText.trim()) {
            this.setState({socialErr: '目标 ID 和评论内容都要填'});
            return;
        }
        this.setState({socialBusy: true, socialErr: '', socialOk: ''});
        try {
            await rwck.comments.create({targetType: commentTargetType, targetId: commentTargetId, content: commentText});
            this.setState({commentText: '', socialOk: '评论已发布', socialBusy: false});
            this._loadComments();
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    async _toggleLike () {
        const {likeTargetType, likeTargetId} = this.state;
        if (!likeTargetId) {
            this.setState({socialErr: '请填点赞目标 ID'});
            return;
        }
        try {
            await rwck.likes.toggle({targetType: likeTargetType, targetId: likeTargetId});
            this.setState({socialOk: '已切换点赞状态'});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _toggleBookmark () {
        const {bookmarkTargetType, bookmarkTargetId} = this.state;
        if (!bookmarkTargetId) {
            this.setState({socialErr: '请填收藏目标 ID'});
            return;
        }
        try {
            await rwck.bookmarks.add({targetType: bookmarkTargetType, targetId: bookmarkTargetId});
            this.setState({socialOk: '已收藏'});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _checkBookmark () {
        const {bookmarkTargetType, bookmarkTargetId} = this.state;
        try {
            const r = await rwck.bookmarks.check(bookmarkTargetType, bookmarkTargetId);
            this.setState({socialOk: `收藏状态：${JSON.stringify(r)}`});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _sendReaction () {
        const {likeTargetType, likeTargetId} = this.state;
        try {
            await rwck.reactions.add({targetType: likeTargetType, targetId: likeTargetId, reaction: 'like'});
            this.setState({socialOk: '表态已提交'});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _followByUsername () {
        const name = this.state.followUsername.trim();
        if (!name) {
            this.setState({socialErr: '请输入用户名'});
            return;
        }
        this.setState({socialBusy: true, socialErr: '', socialOk: ''});
        try {
            const u = await rwck.users.byUsername(name);
            await rwck.users.toggleFollow(u.id);
            this.setState({socialOk: `已切换对 ${name} 的关注`, socialBusy: false});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    async _followFirstTag () {
        this.setState({socialBusy: true, socialErr: '', socialOk: ''});
        try {
            const list = await rwck.tags.list();
            const first = rwck.unwrapList(list)[0];
            if (!first) {
                this.setState({socialErr: '社区还没有标签', socialBusy: false});
                return;
            }
            await rwck.followTags.add(first.id);
            this.setState({socialOk: `已关注标签 #${first.name}`, socialBusy: false});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    _renderSocial (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>评论</div>
                    <div style={S.row}>
                        <label style={S.label}>目标类型</label>
                        <select style={S.input} value={this.state.commentTargetType}
                                onChange={e=>this.setState({commentTargetType: e.target.value})}>
                            <option value='project'>作品</option>
                            <option value='discussion'>讨论</option>
                            <option value='extension'>扩展</option>
                        </select>
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>目标 ID</label>
                        <input style={S.input} value={this.state.commentTargetId}
                               onChange={e=>this.setState({commentTargetId: e.target.value})} />
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadComments()}>
                            <RefreshCw size={14} strokeWidth={2.2} /> 加载
                        </button>
                    </div>
                    <div style={S.row}>
                        <textarea style={S.textarea} value={this.state.commentText}
                                  onChange={e=>this.setState({commentText: e.target.value})}
                                  placeholder='写点评论…' />
                    </div>
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._postComment()}>
                            <Send size={14} strokeWidth={2.2} /> 发表评论
                        </button>
                    </div>
                    {this.state.commentsList.map((c, i) => (
                        <div key={c.id || i} style={{...S.listItem, alignItems:'flex-start'}}>
                            <span style={{flex:1}}>
                                <b style={{fontSize:12}}>{c.author && (c.author.nickname || c.author.username) || '匿名'}</b>
                                <div style={{fontSize:12, color: C.text}}>{c.content}</div>
                            </span>
                            <span style={{fontSize:11, color: C.textSubtle}}>{this._fmtTime(c.createdAt)}</span>
                        </div>
                    ))}
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>点赞 / 表态 / 收藏</div>
                    <div style={S.row}>
                        <label style={S.label}>目标类型</label>
                        <select style={S.input} value={this.state.likeTargetType}
                                onChange={e=>this.setState({likeTargetType: e.target.value})}>
                            <option value='project'>作品</option>
                            <option value='discussion'>讨论</option>
                            <option value='post'>帖子</option>
                            <option value='extension'>扩展</option>
                        </select>
                        <label style={S.label}>目标 ID</label>
                        <input style={S.input} value={this.state.likeTargetId}
                               onChange={e=>this.setState({
                                   likeTargetId: e.target.value,
                                   bookmarkTargetId: e.target.value,
                                   bookmarkTargetType: this.state.likeTargetType
                               })} />
                    </div>
                    <div style={{...S.row, marginTop:6, flexWrap:'wrap'}}>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._toggleLike()}>
                            <ThumbsUp size={14} strokeWidth={2.2} /> 点赞 / 取消
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._sendReaction()}>
                            <Smile size={14} strokeWidth={2.2} /> 表态
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._toggleBookmark()}>
                            <Bookmark size={14} strokeWidth={2.2} /> 收藏
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._checkBookmark()}>
                            <Search size={14} strokeWidth={2.2} /> 查收藏状态
                        </button>
                    </div>
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>关注</div>
                    <div style={S.row}>
                        <label style={S.label}>用户名</label>
                        <input style={S.input} value={this.state.followUsername}
                               onChange={e=>this.setState({followUsername: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._followByUsername()}>
                            <UserPlus size={14} strokeWidth={2.2} /> 关注 / 取关
                        </button>
                    </div>
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._followFirstTag()}>
                            <Hash size={14} strokeWidth={2.2} /> 关注第一个标签
                        </button>
                    </div>
                </div>

                {errBar(S, this.state.socialErr)}
                {okBar(S, this.state.socialOk)}
            </div>
        );
    }

    // ========== 通知 / 签到 ==========
    async _loadNotify () {
        this.setState({notifyBusy: true, notifyErr: ''});
        try {
            const r = await rwck.notifications.list({page: 1, pageSize: 30});
            this.setState({notifyList: rwck.unwrapList(r), notifyBusy: false});
        } catch (e) {
            this.setState({notifyErr: this._friendlyError(e), notifyBusy: false});
        }
    }

    async _loadCheckin () {
        try {
            const s = await rwck.checkin.status();
            this.setState({checkin: s});
        } catch (_) { /* 未登录时忽略 */ }
    }

    async _doCheckin () {
        try {
            await rwck.checkin.checkin();
            this.setState({notifyErr: ''});
            this._loadCheckin();
        } catch (e) {
            this.setState({notifyErr: this._friendlyError(e)});
        }
    }

    _renderNotify (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.row}>
                        <strong style={{fontSize:13}}>每日签到</strong>
                        <span style={{flex:1}} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._doCheckin()}>
                            <Star size={14} strokeWidth={2.2} /> 签到
                        </button>
                    </div>
                    {this.state.checkin && (
                        <div style={S.hint}>
                            连续签到 {this.state.checkin.streak ?? this.state.checkin.days ?? 0} 天
                            {this.state.checkin.checkedToday ? '（今天已签到）' : ''}
                        </div>
                    )}
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>通知</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadNotify()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                    <button style={cls(S.btn, S.btnGhost)}
                            onClick={async ()=>{
                                try { await rwck.notifications.markAllRead(); this._loadNotify(); }
                                catch (e) { this.setState({notifyErr: this._friendlyError(e)}); }
                            }}>
                        <CheckCircle size={14} strokeWidth={2.2} /> 全部已读
                    </button>
                </div>
                {errBar(S, this.state.notifyErr)}
                {this.state.notifyBusy && <div style={S.ok}>加载中…</div>}
                {this.state.notifyList.map((n, i) => (
                    <div key={n.id || i} style={S.listItem}>
                        <Bell size={13} strokeWidth={2.2} style={{color: n.read ? C.textSubtle : C.accent}} />
                        <span style={{flex:1, minWidth:0}}>{n.content || n.title || n.type}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{this._fmtTime(n.createdAt)}</span>
                        {!n.read && (
                            <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='标记已读'
                                    onClick={async ()=>{
                                        try { await rwck.notifications.markRead(n.id); this._loadNotify(); }
                                        catch (e) { this.setState({notifyErr: this._friendlyError(e)}); }
                                    }}>
                                <CheckCircle size={13} strokeWidth={2.2} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // ========== 搜索 ==========
    async _doSearch () {
        const q = this.state.searchQ.trim();
        if (!q) {
            this.setState({searchErr: '请输入关键词'});
            return;
        }
        this.setState({searchBusy: true, searchErr: ''});
        try {
            const r = await rwck.search.query(q, this.state.searchType, 1, 20);
            this.setState({searchResult: r, searchBusy: false});
        } catch (e) {
            this.setState({searchErr: this._friendlyError(e), searchBusy: false});
        }
    }

    _renderSearch (S, C) {
        const r = this.state.searchResult;
        const items = r ? rwck.unwrapList(r) : [];
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.row}>
                    <input style={S.input} placeholder='搜索作品 / 讨论 / 用户…' value={this.state.searchQ}
                           onChange={e=>this.setState({searchQ: e.target.value})} />
                    <select style={{...S.input, flex:'0 0 120px'}} value={this.state.searchType}
                            onChange={e=>this.setState({searchType: e.target.value})}>
                        <option value='all'>全部</option>
                        <option value='project'>作品</option>
                        <option value='discussion'>讨论</option>
                        <option value='user'>用户</option>
                        <option value='extension'>扩展</option>
                    </select>
                    <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._doSearch()}>
                        <Search size={14} strokeWidth={2.2} /> 搜索
                    </button>
                </div>
                {errBar(S, this.state.searchErr)}
                {this.state.searchBusy && <div style={S.ok}>搜索中…</div>}
                {items.map((it, i) => (
                    <div key={it.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>{it.title || it.name || it.username || JSON.stringify(it).slice(0, 60)}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{it.type || ''}</span>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 原创登记 ==========
    async _loadOrig () {
        this.setState({origBusy: true, origErr: ''});
        try {
            const r = await rwck.origmark.registrations();
            this.setState({origList: rwck.unwrapList(r), origBusy: false});
        } catch (e) {
            this.setState({origErr: this._friendlyError(e), origBusy: false});
        }
    }

    async _verifyOrig () {
        const cert = this.state.origCert.trim();
        if (!cert) {
            this.setState({origErr: '请输入登记号'});
            return;
        }
        this.setState({origBusy: true, origErr: '', origOk: ''});
        try {
            const r = await rwck.origmark.verify(cert);
            this.setState({origVerify: r, origOk: `登记号 ${cert} 校验完成`, origBusy: false});
        } catch (e) {
            this.setState({origErr: this._friendlyError(e), origBusy: false});
        }
    }

    _renderOrig (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>校验登记号</div>
                    <div style={S.row}>
                        <label style={S.label}>登记号</label>
                        <input style={S.input} value={this.state.origCert}
                               onChange={e=>this.setState({origCert: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._verifyOrig()}>
                            <ShieldCheck size={14} strokeWidth={2.2} /> 校验
                        </button>
                    </div>
                    {this.state.origVerify && (
                        <pre style={{...S.hint, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
                            {JSON.stringify(this.state.origVerify, null, 2)}
                        </pre>
                    )}
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>我的登记</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadOrig()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                </div>
                {errBar(S, this.state.origErr)}
                {okBar(S, this.state.origOk)}
                {this.state.origList.map((g, i) => (
                    <div key={g.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>{g.title || g.certNumber || `登记 #${g.id}`}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{g.status || ''}</span>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 云变量 ==========
    async _loadCloud () {
        if (!rwck.authState().token) {
            this.setState({cloudErr: '请先登录'});
            return;
        }
        this.setState({cloudBusy: true, cloudErr: ''});
        try {
            const r = await rwck.cloud.list();
            this.setState({cloudProjects: rwck.unwrapList(r), cloudBusy: false});
        } catch (e) {
            this.setState({cloudErr: this._friendlyError(e), cloudBusy: false});
        }
    }

    async _createCloud () {
        const name = this.state.cloudName.trim();
        if (!name) {
            this.setState({cloudErr: '请输入项目名'});
            return;
        }
        try {
            await rwck.cloud.create(name);
            this.setState({cloudName: '', cloudOk: '云变量项目已创建'});
            this._loadCloud();
        } catch (e) {
            this.setState({cloudErr: this._friendlyError(e)});
        }
    }

    async _loadCloudVars (id) {
        this.setState({cloudSel: id, cloudBusy: true, cloudErr: ''});
        try {
            const [vars, history] = await Promise.all([rwck.cloud.variables(id), rwck.cloud.history(id)]);
            this.setState({cloudVars: vars, cloudHistory: history, cloudBusy: false});
        } catch (e) {
            this.setState({cloudErr: this._friendlyError(e), cloudBusy: false});
        }
    }

    async _setCloudVar () {
        const {cloudSel, cloudVarName, cloudVarValue} = this.state;
        if (!cloudSel || !cloudVarName.trim()) {
            this.setState({cloudErr: '请先选项目并填变量名'});
            return;
        }
        try {
            await rwck.cloud.setVariable(cloudSel, {name: cloudVarName, value: cloudVarValue, scope: 'global'});
            this.setState({cloudOk: `已设置 ${cloudVarName}`});
            this._loadCloudVars(cloudSel);
        } catch (e) {
            this.setState({cloudErr: this._friendlyError(e)});
        }
    }

    _renderCloud (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>新建云变量项目</div>
                    <div style={S.row}>
                        <label style={S.label}>项目名</label>
                        <input style={S.input} value={this.state.cloudName}
                               onChange={e=>this.setState({cloudName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createCloud()}>
                            <Plus size={14} strokeWidth={2.2} /> 创建
                        </button>
                    </div>
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>我的云项目</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadCloud()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> 刷新
                    </button>
                </div>
                {errBar(S, this.state.cloudErr)}
                {okBar(S, this.state.cloudOk)}
                {this.state.cloudProjects.map((p, i) => (
                    <div key={p.id || i} style={S.listItem}>
                        <Database size={13} strokeWidth={2.2} style={{color: C.textSubtle}} />
                        <span style={{flex:1, minWidth:0}}>{p.name}</span>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='查看变量'
                                onClick={()=>this._loadCloudVars(p.id)}>
                            <Eye size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}
                {this.state.cloudSel && (
                    <div style={S.box}>
                        <div style={S.sectionTitle}>设置变量</div>
                        <div style={S.row}>
                            <label style={S.label}>变量名</label>
                            <input style={S.input} value={this.state.cloudVarName}
                                   onChange={e=>this.setState({cloudVarName: e.target.value})} />
                        </div>
                        <div style={S.row}>
                            <label style={S.label}>值</label>
                            <input style={S.input} value={this.state.cloudVarValue}
                                   onChange={e=>this.setState({cloudVarValue: e.target.value})} />
                        </div>
                        <div style={{...S.row, marginTop:6}}>
                            <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._setCloudVar()}>
                                <Zap size={14} strokeWidth={2.2} /> 写入
                            </button>
                        </div>
                        {this.state.cloudVars && (
                            <pre style={{...S.hint, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
                                {JSON.stringify(this.state.cloudVars, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ========== 开发者（API 密钥 / 标签 / 变更日志） ==========
    async _loadDev () {
        if (!rwck.authState().token) {
            this.setState({devErr: '请先登录'});
            return;
        }
        this.setState({devBusy: true, devErr: ''});
        try {
            const [keys, tags, logs] = await Promise.all([
                rwck.apiKeys.list().catch(()=>[]),
                rwck.tags.list().catch(()=>[]),
                rwck.changelogs.list({page: 1, pageSize: 20}).catch(()=>[])
            ]);
            this.setState({
                devKeys: rwck.unwrapList(keys),
                devTags: rwck.unwrapList(tags),
                devLogs: rwck.unwrapList(logs),
                devBusy: false
            });
        } catch (e) {
            this.setState({devErr: this._friendlyError(e), devBusy: false});
        }
    }

    async _createKey () {
        const name = this.state.newKeyName.trim();
        if (!name) {
            this.setState({devErr: '请输入密钥名称'});
            return;
        }
        try {
            await rwck.apiKeys.create({name});
            this.setState({newKeyName: '', devOk: '密钥已创建'});
            this._loadDev();
        } catch (e) {
            this.setState({devErr: this._friendlyError(e)});
        }
    }

    async _removeKey (id) {
        try {
            await rwck.apiKeys.remove(id);
            this._loadDev();
        } catch (e) {
            this.setState({devErr: this._friendlyError(e)});
        }
    }

    async _createTag () {
        const name = this.state.newTagName.trim();
        if (!name) {
            this.setState({devErr: '请输入标签名'});
            return;
        }
        try {
            await rwck.tags.create({name});
            this.setState({newTagName: '', devOk: '标签已创建'});
            this._loadDev();
        } catch (e) {
            this.setState({devErr: this._friendlyError(e)});
        }
    }

    async _removeTag (id) {
        try {
            await rwck.tags.remove(id);
            this._loadDev();
        } catch (e) {
            this.setState({devErr: this._friendlyError(e)});
        }
    }

    _renderDev (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>API 密钥</div>
                    <div style={S.row}>
                        <label style={S.label}>名称</label>
                        <input style={S.input} value={this.state.newKeyName}
                               onChange={e=>this.setState({newKeyName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createKey()}>
                            <Key size={14} strokeWidth={2.2} /> 新建
                        </button>
                    </div>
                    {this.state.devKeys.map((k, i) => (
                        <div key={k.id || i} style={S.listItem}>
                            <Key size={13} strokeWidth={2.2} style={{color: C.textSubtle}} />
                            <span style={{flex:1, minWidth:0}}>{k.name}</span>
                            <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title='删除'
                                    onClick={()=>this._removeKey(k.id)}>
                                <Trash2 size={13} strokeWidth={2.2} />
                            </button>
                        </div>
                    ))}
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>社区标签</div>
                    <div style={S.row}>
                        <label style={S.label}>标签名</label>
                        <input style={S.input} value={this.state.newTagName}
                               onChange={e=>this.setState({newTagName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createTag()}>
                            <Tag size={14} strokeWidth={2.2} /> 新建
                        </button>
                    </div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:6}}>
                        {this.state.devTags.map((t, i) => (
                            <span key={t.id || i} style={{
                                padding:'3px 8px', borderRadius:12, fontSize:11,
                                background: C.accentSoft, color: C.accent, border:`1px solid ${C.accentBorder}`,
                                display:'inline-flex', alignItems:'center', gap:4
                            }}>
                                #{t.name || t.slug}
                                <button style={{border:'none', background:'transparent', cursor:'pointer',
                                                color:'inherit', padding:0}}
                                        onClick={()=>this._removeTag(t.id)}>
                                    <Trash2 size={11} strokeWidth={2.2} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <div style={S.sectionTitle}>变更日志</div>
                {this.state.devLogs.map((l, i) => (
                    <div key={l.id || i} style={S.listItem}>
                        <FileText size={13} strokeWidth={2.2} style={{color: C.textSubtle}} />
                        <span style={{flex:1, minWidth:0}}>{l.title || l.content || l.version}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{this._fmtTime(l.createdAt)}</span>
                    </div>
                ))}

                {errBar(S, this.state.devErr)}
                {okBar(S, this.state.devOk)}
            </div>
        );
    }
}

export default RwckPublishPanel;
export {CATEGORIES};


/**
 * 创客次元设置自由窗口面板。
 *   ① 顶部 CORS 横幅（原主面板横幅挪到这里）
 *   ② CORS 代理前缀输入 + 确认修改 / 恢复默认（默认 https://cors-api.rewp.de5.net）
 *   ③ 下方大网络日志窗口（颜色 + 复制 + 清空按钮）。
 */
class RwckSettingsPanel extends Component {
    constructor (props) {
        super(props);
        const saved = (typeof localStorage !== 'undefined') && localStorage.getItem('rwck:cors-anywhere');
        this.state = {
            proxyInput: saved || (props && props.getApiClient && props.getApiClient().CORS_ANYWHERE)
                || 'https://cors-api.rewp.de5.net',
            applyBusy: false, applyMsg: ''
        };
        this._bodyRef = React.createRef();
        this._logRender = this._logRender.bind(this);
    }
    componentDidMount () {
        // 直接 require api-client 拿到 getNetLog / clearNetLog（都是 api-client.js 里已导出的）
        try {
            const mod = require('./api-client.js');
            this._getNetLog = mod.getNetLog;
            this._clearNetLog = mod.clearNetLog;
        } catch (_) {}
        this._timer = setInterval(this._logRender, 700);
        this._logRender();
    }
    componentWillUnmount () { if (this._timer) clearInterval(this._timer); }

    _logRender () {
        const body = this._bodyRef && this._bodyRef.current;
        if (!body) return;
        const logs = (this._getNetLog && this._getNetLog()) || [];
        if (!logs.length) {
            body.innerHTML = '<div style="color:#7a8290;padding:12px">暂无请求。触发登录 / 发布 / 发帖后，这里会显示所有发送与接收。</div>';
            return;
        }
        body.innerHTML = '';
        logs.forEach(e => {
            const row = document.createElement('div');
            row.style.cssText = 'border-bottom:1px solid #1d222c;padding:6px 0;word-break:break-all;';
            const dirColor = e.dir.startsWith('→') ? '#7fd1ff'
                : e.dir.startsWith('✗') ? '#ff7a7a'
                : (e.ok ? '#8ce99a' : '#ffd479');
            const t = new Date(e.t).toLocaleTimeString();
            row.innerHTML =
                `<div><span style="color:#7a8290">${t}</span> ` +
                `<span style="color:${dirColor};font-weight:bold">${e.dir}</span> ` +
                `<span style="color:#fff">${e.method || 'GET'}</span> ` +
                `<span style="color:#cdd6e4">${e.url}</span>` +
                (e.status ? ` <span style="color:${e.ok ? '#8ce99a' : '#ffd479'}">[${e.status}]</span>` : '') +
                (e.error ? `<div style="color:#ff9a9a">错误: ${e.error}</div>` : '') +
                '</div>';
            body.appendChild(row);
        });
        body.scrollTop = body.scrollHeight;
    }

    _asyncApply () {
        const v = (this.state.proxyInput || '').trim().replace(/\/$/, '');
        if (!v) return this.setState({applyMsg: '代理前缀不能为空'});
        if (!/^https?:\/\//.test(v)) return this.setState({applyMsg: '代理前缀必须以 http:// 或 https:// 开头'});
        this.setState({applyBusy: true, applyMsg: '正在应用…'});
        try {
            localStorage.setItem('rwck:cors-anywhere', v);
            if (typeof window !== 'undefined') window.__RWCK_CORS_ANYWHERE__ = v;
            setTimeout(() => this.setState({applyBusy: false,
                applyMsg: '已保存。大部分接口会立即生效；\n如需完全切换（含 BASE_URL），请刷新页面。'}), 250);
        } catch (e) {
            this.setState({applyBusy: false, applyMsg: '保存失败：' + (e.message || e)});
        }
    }

    _restoreDefault () {
        if (!window.confirm('恢复默认 https://cors-api.rewp.de5.net ？')) return;
        localStorage.removeItem('rwck:cors-anywhere');
        if (typeof window !== 'undefined') window.__RWCK_CORS_ANYWHERE__ = undefined;
        this.setState({proxyInput: 'https://cors-api.rewp.de5.net', applyMsg: '已恢复默认'});
    }

    async _copyLog () {
        const logs = (this._getNetLog && this._getNetLog()) || [];
        const text = logs.map(e => {
            let s = `[${new Date(e.t).toLocaleTimeString()}] ${e.dir} ${e.method || 'GET'} ${e.url}`;
            if (e.status) s += ` [${e.status}]`;
            if (e.error) s += ` ⚠ ${e.error}`;
            return s;
        }).join('\n');
        try { await navigator.clipboard.writeText(text); this.setState({applyMsg: '日志已复制到剪贴板'}); }
        catch (_) { this.setState({applyMsg: '复制失败，请手动选文本'}); }
    }
    _clearLog () {
        if (this._clearNetLog) { this._clearNetLog(); this._logRender(); this.setState({applyMsg: '日志已清空'}); }
    }

    render () {
        const C = this.props.colors || {accent:'#2b6cff', surface:'#fff', text:'#222', textMuted:'#666',
            textSubtle:'#999', border:'#e5e7eb', shadowSm:'0 1px 2px rgba(0,0,0,.08)'};
        const S = {
            root: {display:'flex', flexDirection:'column', gap:12, padding:14, height:'100%', minHeight:0, boxSizing:'border-box', fontSize:13},
            sectionTitle: {fontSize:11, fontWeight:700, color:C.textMuted, marginTop:4, marginBottom:6,
                letterSpacing:'.04em', textTransform:'uppercase'},
            box: {border:'1px solid ' + C.border, borderRadius:10, padding:12, background:C.surface || '#fff'},
            row: {display:'flex', gap:8, alignItems:'center', marginBottom:6},
            label: {fontSize:12, color:C.textMuted, fontWeight:500, minWidth:120},
            input: {flex:1, padding:'8px 10px', border:'1px solid ' + C.border, borderRadius:6, fontSize:13,
                background:'#fff', outline:'none', fontFamily:'ui-monospace, Menlo, Consolas, monospace'},
            hint: {fontSize:11, color:C.textSubtle, lineHeight:1.5},
            btn: {padding:'7px 14px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
                display:'inline-flex', gap:6, alignItems:'center', boxShadow:'0 1px 2px rgba(0,0,0,.08)'},
            btnPrimary: {background: C.accent, color:'#fff'},
            btnGhost: {background:'#fff', border:'1px solid ' + C.border, color:C.text},
            btnDisabled: {opacity:.5, cursor:'not-allowed'},
            msg: {fontSize:12, padding:'6px 10px', borderRadius:6, background:'#f1f5f9', color:'#334155',
                border:'1px solid #e2e8f0', marginTop:4, whiteSpace:'pre-line'},
            corsBanner: {display:'flex', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid #fbbf24',
                background:'#fff7ed', color:'#78350f', fontSize:12, lineHeight:1.5},
            logBox: {flex:1, minHeight:220, background:'#11151c', color:'#e6e6e6', borderRadius:10,
                border:'1px solid #2a2f3a', overflow:'hidden', display:'flex', flexDirection:'column'},
            logHeader: {display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                borderBottom:'1px solid #2a2f3a', background:'#0c0f14'},
            logBody: {flex:1, overflow:'auto', padding:'8px 10px',
                fontFamily:'ui-monospace, Menlo, Consolas, monospace', fontSize:12, lineHeight:1.45}
        };
        return (
            <div style={S.root}>
                {/* 顶部 CORS 横幅（原主面板横幅挪到这里） */}
                <div style={S.corsBanner}>
                    <AlertCircle size={15} strokeWidth={2.2} style={{flex:'0 0 auto', marginTop:1, color:'#d97706'}} />
                    <div style={{flex:1, minWidth:0}}>
                        <b>CORS 代理说明：</b> 创客次元 API 未回
                        <code style={{background:'#fef3c7', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>
                            Access-Control-Allow-Origin
                        </code>
                        。如果某 Tab 一直 loading / 报错，请把「CORS 代理前缀」指向一个 cors-anywhere 类服务
                        （Cloudflare Worker / Pages 部署即可）。
                    </div>
                </div>

                {/* 设置：CORS 代理前缀 */}
                <div style={S.box}>
                    <div style={S.sectionTitle}>CORS 代理前缀</div>
                    <div style={S.row}>
                        <label style={S.label}>代理前缀</label>
                        <input style={S.input} value={this.state.proxyInput}
                               onChange={e => this.setState({proxyInput: e.target.value})}
                               placeholder='https://your-cors-anywhere.workers.dev' />
                    </div>
                    <div style={S.hint}>
                        形如 <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>https://your-cors-anywhere.workers.dev</code>
                        ，会自动追加 <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>?url=https://forum.ctspace.xyz/api/xxx</code>。
                        当前默认值（用户自部署）：
                        <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>
                            {(this.props.getApiClient && this.props.getApiClient().CORS_ANYWHERE)
                                || 'https://cors-api.rewp.de5.net'}
                        </code>
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={{...S.btn, ...S.btnPrimary, ...(this.state.applyBusy && S.btnDisabled)}}
                                disabled={this.state.applyBusy}
                                onClick={() => this._asyncApply()}>
                            <CheckCircle size={13} strokeWidth={2.2} /> {this.state.applyBusy ? '应用中…' : '确认修改'}
                        </button>
                        <button style={{...S.btn, ...S.btnGhost}} onClick={() => this._restoreDefault()}>
                            <Trash2 size={13} strokeWidth={2.2} /> 恢复默认
                        </button>
                    </div>
                    {this.state.applyMsg && <div style={S.msg}>{this.state.applyMsg}</div>}
                </div>

                {/* 网络日志大窗口 */}
                <div style={S.logBox}>
                    <div style={S.logHeader}>
                        <span style={{fontWeight:700, color:'#e6e6e6'}}>网络请求日志（发送 / 接收 / 错误）</span>
                        <span style={{flex:1}} />
                        <button style={{...S.btn, ...S.btnGhost, fontSize:11, padding:'3px 10px'}}
                                onClick={() => this._copyLog()}>复制</button>
                        <button style={{...S.btn, ...S.btnGhost, fontSize:11, padding:'3px 10px'}}
                                onClick={() => this._clearLog()}>清空</button>
                    </div>
                    <div style={S.logBody} ref={this._bodyRef} />
                </div>
            </div>
        );
    }
}
