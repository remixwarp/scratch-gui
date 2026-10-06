/**
 * 创客次元发布窗口主界面。
 *
 * 五个 Tab：
 *   [登录]     — 图文验证码 + PoW（自动算）+ 账号密码 + 手动粘贴兜底
 *   [社区状态] — /stats/public 连通性自检 + /discussions 最新帖预览 + 活跃用户 + 排行榜
 *   [发布作品] — 封面 / sb3 上传 / 分类 / 简介 / 允许下载
 *   [发帖]     — 正文 Markdown / 附件引用
 *   [我的作品] — 快速更新版本 / 删 / 开短链
 *
 * 主题色：所有 color 都来自 props.colors.primary（从编辑器当前主题读的 --ui-primary）。
 */

import React, {Component} from 'react';
import rwck from './api-client.js';
import {
    Users, MessageCircle, BookOpen, BarChart3,
    Upload, FolderOpen, RefreshCw, ChevronDown, ChevronUp,
    FileCode, Eye, Heart,
    AlertCircle, CheckCircle, LogIn, LogOut,
    Activity, Tag, Globe
} from 'lucide-react';

const PAD = 14;

// ==== 参考 forum.ctspace.xyz 样式（brand-strong: #0b57d0 蓝主色 + shadow + 圆角） ====
const RADIUS_SM = 6;
const RADIUS_MD = 10;
const RADIUS_LG = 14;
const SHADOW_SM = '0 1px 2px rgba(15, 23, 42, 0.06)';
const SHADOW_MD = '0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)';
const SHADOW_LG = '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)';

const STYLE = colors => {
    const brand = colors.primary || '#0b57d0';
    return {
        root: {padding: PAD, display:'flex', flexDirection:'column', gap:10, height:'100%', minHeight:0,
               background:'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'},
        titleRow: {display:'flex', alignItems:'center', gap:10, paddingBottom:10,
                   borderBottom:'1px solid #e5e7eb'},
        brandDot: {width:12, height:12, borderRadius:6, background: brand,
                   boxShadow:`0 0 0 3px ${brand}20`},
        tabs: {display:'flex', gap:4, padding:'4px 6px', background:'#f1f5f9',
               borderRadius: RADIUS_MD},
        tab: {padding:'7px 12px', cursor:'pointer', borderRadius: RADIUS_SM,
              border:'none', background:'transparent', fontSize:13, fontWeight:600,
              color:'#64748b', transition:'all .15s ease', display:'flex', alignItems:'center', gap:6},
        tabActive: {background:'#fff', color: brand, boxShadow: SHADOW_SM},
        body: {flex:1, overflow:'auto', padding:'12px 2px', display:'flex', flexDirection:'column', gap:10},

        row: {display:'flex', gap:8, alignItems:'center'},
        label: {fontSize:12, color:'#475569', minWidth:92, fontWeight:500},
        input: {flex:1, padding:'8px 10px', border:'1px solid #e2e8f0',
                borderRadius: RADIUS_SM, fontSize:13, background:'#fff',
                transition:'border-color .15s ease, box-shadow .15s ease',
                outline:'none'},
        textarea:{flex:1, padding:'8px 10px', border:'1px solid #e2e8f0',
                  borderRadius: RADIUS_SM, fontSize:13, minHeight:90, resize:'vertical',
                  background:'#fff', transition:'border-color .15s ease', outline:'none',
                  fontFamily:'inherit'},

        btn: {padding:'8px 14px', borderRadius: RADIUS_SM, border:'none', fontSize:13, fontWeight:600,
              cursor:'pointer', transition:'all .12s ease', outline:'none',
              display:'inline-flex', alignItems:'center', gap:6,
              boxShadow: SHADOW_SM},
        btnPrimary: {background: brand, color:'#fff',
                     boxShadow:`0 1px 2px ${brand}40`},
        btnGhost:   {background:'#fff', border:'1px solid #e2e8f0', color:'#334155',
                     boxShadow:'none'},
        btnDanger:  {background:'#dc2626', color:'#fff', boxShadow:'0 1px 2px rgba(220,38,38,.4)'},
        btnDisabled: {opacity:.55, cursor:'not-allowed', boxShadow:'none', transform:'none !important'},
        btnActive: {transform:'translateY(1px)', boxShadow:'0 1px 0 transparent !important'},
        btnIcon: {padding:'6px 8px', borderRadius: RADIUS_SM},

        box:     {border:'1px solid #e5e7eb', borderRadius: RADIUS_MD,
                  padding:12, background:'#fff', boxShadow: SHADOW_SM},
        card:    {border:'1px solid #e5e7eb', borderRadius: RADIUS_MD,
                  padding:12, background:'#fff', boxShadow: SHADOW_SM},

        captcha: {border:'1px solid #e2e8f0', borderRadius: RADIUS_SM, padding:6,
                  background:'#fff', height:52, cursor:'pointer', boxShadow:'none'},
        hint:    {fontSize:11, color:'#94a3b8', lineHeight:1.5},
        err:     {color:'#b91c1c', fontSize:12, padding:'8px 10px',
                  background:'#fef2f2', border:'1px solid #fecaca',
                  borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},
        ok:      {color:'#15803d', fontSize:12, padding:'8px 10px',
                  background:'#f0fdf4', border:'1px solid #bbf7d0',
                  borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},
        info:    {color:'#475569', fontSize:12, padding:'8px 10px',
                  background:'#f8fafc', border:'1px solid #e2e8f0',
                  borderRadius: RADIUS_SM, display:'flex', gap:6, alignItems:'center'},

        listItem:{display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                  border:'1px solid #e5e7eb', borderRadius: RADIUS_SM,
                  fontSize:13, background:'#fff', boxShadow: SHADOW_SM},
        switchOn: {background: brand},
        switchOff:{background:'#cbd5e1'},
        avatar:   {width:22, height:22, borderRadius:11, background:'#e2e8f0'},
        fileInfo: {fontSize:11, color:'#64748b'},
        sectionTitle:{fontSize:11, fontWeight:700, color:'#334155',
                      marginTop:6, marginBottom:8, letterSpacing:'.04em',
                      textTransform:'uppercase'},
        subGrid: {display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginTop:8},
        wideGrid:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:10}
    };
};

const CATEGORIES = [
    {id:'game',     zh:'游戏',   en:'Game'},
    {id:'animation',zh:'动画',   en:'Animation'},
    {id:'story',    zh:'故事',   en:'Story'},
    {id:'music',    zh:'音乐',   en:'Music'},
    {id:'art',      zh:'美术',   en:'Art'},
    {id:'tutorial', zh:'教程',   en:'Tutorial'}
];

function cls (...args) { return Object.assign({}, ...args.filter(Boolean)); }

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
            showPaste: false,
            pasteJson: '',
            pasteErr: '',
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

            termsAcceptedForSession: false
        };

        this._refreshCaptcha();

        // 把本组件 ref 挂到 openWin 上，让窗口可以 _rwckSwitchTab
        if (props && props._onRef) {
            try { props._onRef(this); } catch (_) {}
        }
    }

    componentDidMount() {
        // 仅当用户需要这些接口的时候才拉：登录 / community tab 都需要。
        // 社区 tab 是公开的，立即拉。
        this._refreshCommunity();
        this._refreshMine();
    }

    /** 供窗口切换 tab 用（open-rwck-publish-window 可能通过 ref 调）。 */
    _rwckSwitchTab (tab) {
        if (tab && ['login','community','publish','disc','mine'].includes(tab)) {
            this.setState({tab});
        }
    }

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

    /** 拉齐社区面板需要的 6 个公开接口：stats / discussions / leaderboard / active / settings / tags */
    async _refreshCommunity() {
        const latencies = {};
        const t0 = Date.now();

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

        await Promise.all([pStats, pDiscs, pBoard, pActive, pSettings, pTags]);
        this._communityLatencyMs = Date.now() - t0;
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
            return '网络错误：浏览器无法连接 forum.ctspace.xyz 或被 CORS 拦截。可以在控制台执行\n  window.__RWCK_FORCE_PROXY__ = true; location.reload();\n启用同源代理绕开。';
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
                           captchaLoadErr: '自动拉取验证码失败。可点「手动粘贴」用浏览器另开 https://forum.ctspace.xyz/api/captcha 复制 JSON'});
        }
    }

    _parsePastedCaptcha() {
        const raw = (this.state.pasteJson || '').trim();
        if (!raw) { this.setState({pasteErr: '请先粘贴 JSON'}); return; }
        let data;
        try { data = JSON.parse(raw); }
        catch { this.setState({pasteErr: 'JSON 格式不对'}); return; }
        if (!data.token || !data.image) {
            this.setState({pasteErr: 'JSON 里没找到 token / image 字段'}); return;
        }
        let image = data.image;
        if (typeof image === 'string' && !image.startsWith('data:image')) {
            image = 'data:image/png;base64,' + image;
        }
        this.setState({
            captcha: {token: data.token, image, pow: data.pow || {challenge: '', difficulty: data.difficulty || 4}},
            captchaAnswer: '', pasteErr: '', pasteJson: '', showPaste: false, loginErr: ''
        });
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
            this.setState({user: r.user, tab:'publish', loginErr:'', username:'', password:'', captchaAnswer:''});
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
        const C = this.props.colors || {primary:'#4c97ff', secondary:'#333'};
        const S = STYLE(C);
        const tabs = [
            {id:'login',     icon: LogIn,          label: this.state.user ? '账户' : '登录'},
            {id:'community', icon: BarChart3,      label: '社区状态'},
            {id:'publish',   icon: Upload,         label: '发布作品'},
            {id:'disc',      icon: MessageCircle,  label: '发帖'},
            {id:'mine',      icon: FolderOpen,     label: '我的作品'}
        ];

        return (
            <div style={S.root}>
                <div style={S.titleRow}>
                    <span style={S.brandDot} />
                    <strong style={{fontSize:15}}>创客次元 · 极光论坛</strong>
                    <span style={{flex:1}} />
                    <span style={{...S.hint}}>
                        {rwck.IS_PROXY ? '同源代理' : '官方直连'}
                        <code style={{marginLeft:4}}>{rwck.BASE_URL}</code>
                    </span>
                    {this.state.user ? (
                        <span style={{fontSize:12, color:'#666'}}>
                            {this.state.user.username}
                            <button style={cls(S.btn, S.btnGhost, {marginLeft:8})}
                                    onClick={()=>this._logout()} title='退出登录'>
                                <LogOut size={14} strokeWidth={2.2} /> 退出
                            </button>
                        </span>
                    ) : null}
                </div>

                <div style={S.tabs}>
                    {tabs.map(t => (
                        <button key={t.id}
                                style={cls(S.tab, this.state.tab===t.id && S.tabActive)}
                                onClick={()=>this.setState({tab:t.id})}>
                            <t.icon size={14} strokeWidth={2.2} /> {t.label}
                        </button>
                    ))}
                </div>

                <div style={S.body}>
                    {this._renderTab(S, C)}
                </div>
            </div>
        );
    }

    _renderTab(S, C) {
        const t = this.state.tab;
        if (t === 'community') return this._renderCommunity(S, C);
        if (t === 'login')    return this._renderLogin(S, C);
        if (t === 'publish')  return this._renderPublish(S, C);
        if (t === 'disc')     return this._renderDisc(S);
        if (t === 'mine')     return this._renderMine(S);
        return null;
    }

    // ========== 社区状态 ==========
    _renderCommunity(S, C) {
        const primary = C.primary || '#4c97ff';
        const st = this.state.stats;
        const latency = this._communityLatencyMs;
        const discs = this.state.discussionsPreview || [];
        const board = this.state.leaderboard || [];
        const active = this.state.activeUsers || [];
        const tags = this.state.tags || [];

        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {/* 头部：状态行 + 重测 + 切代理 */}
                <div style={cls(S.box, {display:'flex', flexDirection:'column', gap:8})}>
                    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                        <Activity size={16} strokeWidth={2.2} style={{color: this.state.statsErr ? '#dc2626' : primary}} />
                        <strong style={{fontSize:14}}>社区状态</strong>
                        <span style={{flex:1}} />
                        <button style={cls(S.btn, S.btnGhost)}
                                onClick={()=>this._refreshCommunity()}>
                            <RefreshCw size={14} strokeWidth={2.2} /> 重新探测
                        </button>
                        <button style={cls(S.btn, S.btnGhost)}
                                onClick={()=>{ window.__RWCK_FORCE_PROXY__ = !rwck.IS_PROXY; location.reload(); }}
                                title='forum 未回 ACAO 时切同源代理'>
                            {rwck.IS_PROXY ? '关闭代理' : '切同源代理'}
                        </button>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center', fontSize:12}}>
                        {latency != null && !this.state.statsErr && (
                            <span style={{color:'#15803d'}}>
                                <CheckCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                连通，耗时 {latency} ms
                            </span>
                        )}
                        {this.state.statsErr && (
                            <span style={{color:'#dc2626'}}>
                                <AlertCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                {this._friendlyError(this.state.statsErr)}
                            </span>
                        )}
                        {!latency && !this.state.statsErr && !this.state.statsBusy && (
                            <span style={{color:'#64748b'}}>正在获取…</span>
                        )}
                    </div>
                </div>

                {/* 核心指标 */}
                {st && (
                    <div style={cls(S.box, {padding:14})}>
                        <div style={S.sectionTitle}>站点总览</div>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
                            {[
                                {label:'注册用户',   value: st.users || 0,           icon: Users,      color:'#3b82f6'},
                                {label:'帖子总数',   value: st.posts || 0,           icon: MessageCircle, color:'#10b981'},
                                {label:'讨论串',     value: st.discussions || 0,     icon: BookOpen,   color:'#f59e0b'},
                                {label:'今日访问',   value: st.todayVisits || 0,     icon: Activity,   color:'#ef4444'}
                            ].map((c, i) => (
                                <div key={i} style={{
                                    border:'1px solid #e5e7eb', borderRadius: RADIUS_MD,
                                    padding:10, textAlign:'center', background:'#fff',
                                    boxShadow: SHADOW_SM
                                }}>
                                    <c.icon size={18} strokeWidth={2.2} style={{color: c.color, marginBottom:4}} />
                                    <div style={{fontSize:20, fontWeight:700, color: primary}}>{c.value}</div>
                                    <div style={{fontSize:11, color:'#64748b'}}>{c.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 两栏：最新讨论 + 活跃用户 / 排行榜 */}
                <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:10}}>
                    {/* 最新讨论 */}
                    <div style={S.box}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                            <div style={S.sectionTitle}>最新讨论</div>
                            <a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'
                               style={{...S.hint, color:primary, textDecoration:'none', fontWeight:600}}>
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
                                                      color: i<3 ? primary : '#999'}}>#{d.seq || i+1}</div>
                                        {author.avatar && (
                                            <img src={author.avatar} alt='' style={{width:26, height:26, borderRadius:13, border:'1px solid #eee'}} />
                                        )}
                                        <div style={{flex:1, minWidth:0}}>
                                            <div style={{fontWeight:600, fontSize:13, color:'#222',
                                                          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                                {d.title}
                                            </div>
                                            <div style={{...S.hint, marginTop:2}}>
                                                由 <b>{author.nickname || author.username || '匿名'}</b>
                                                · <span style={{color:'#475569'}}>{this._fmtTime(d.createdAt)}</span>
                                            </div>
                                        </div>
                                        <span style={{fontSize:11, color:'#888', whiteSpace:'nowrap'}}>
                                            <MessageCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color:'#64748b'}} /> {d.postCount || 0}
                                        </span>
                                        <span style={{fontSize:11, color:'#888', whiteSpace:'nowrap'}}>
                                            <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color:'#64748b'}} /> {d.views || 0}
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
                                             fontSize:13, borderBottom:'1px dashed #e5e7eb'}}>
                                    <span style={{width:18, fontWeight:700, color: i<3 ? primary : '#999'}}>#{i+1}</span>
                                    {u.avatar && (
                                        <img src={u.avatar} alt='' style={{width:22, height:22, borderRadius:11, border:'1px solid #eee'}} />
                                    )}
                                    <span style={{flex:1, fontWeight:600}}>
                                        {u.nickname || u.username || '匿名'}
                                    </span>
                                    <span style={{fontSize:11, color:'#64748b'}}>
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
                                       style={{padding:'4px 8px', border:'1px solid #e5e7eb',
                                               borderRadius:12, fontSize:11, color:'#334155',
                                               textDecoration:'none', display:'inline-flex', gap:4,
                                               alignItems:'center', background:'#fff'}}>
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
                                                   background:`${primary}14`, color: primary,
                                                   textDecoration:'none', border:`1px solid ${primary}30`}}>
                                            #{t.name || t.slug || t.title || `tag${i+1}`}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 站内入口 */}
                <div style={cls(S.box, {display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'})}>
                    <a href='https://forum.ctspace.xyz' target='_blank' rel='noreferrer'
                       style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                        <Globe size={14} strokeWidth={2.2} /> 访问论坛首页
                    </a>
                    <a href='https://forum.ctspace.xyz/projects' target='_blank' rel='noreferrer'
                       style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                        <FolderOpen size={14} strokeWidth={2.2} /> 作品广场
                    </a>
                    <a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'
                       style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                        <MessageCircle size={14} strokeWidth={2.2} /> 发新帖
                    </a>
                    <a href='https://forum.ctspace.xyz/signup' target='_blank' rel='noreferrer'
                       style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                        <LogIn size={14} strokeWidth={2.2} /> 注册账号
                    </a>
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
        const primary = C.primary;
        const hasImage = !!captcha;
        const loginDisabled = this.state.loginBusy || !this.state.username || !this.state.password
                              || !captcha || !this.state.captchaAnswer;

        return (
            <div style={S.box}>
                <div style={S.sectionTitle}>登录 / 注册</div>
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
                                  minWidth:140, color:'#888', fontSize:12}}>
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

                <div style={{marginTop:2}}>
                    <a role='button' onClick={()=>this.setState(s=>({showPaste: !s.showPaste, pasteErr:''}))}
                       style={{...S.hint, color: primary, fontWeight:600, cursor:'pointer',
                               textDecoration:'underline', border:'none', background:'transparent', padding:0}}>
                        {this.state.showPaste ? '▼ 收起手动粘贴面板' : '▶ 手动粘贴（不显示验证码时用）'}
                    </a>
                    {this.state.captchaLoadErr && !hasImage && (
                        <div style={{...S.err, marginTop:6}}>{this.state.captchaLoadErr}</div>
                    )}
                </div>

                {this.state.showPaste && (
                    <div style={{...S.box, background:'#fff', border:'1px dashed #bbb', marginTop:6}}>
                        <ol style={{margin:0, paddingLeft:20, ...S.hint}}>
                            <li>打开 <a href='https://forum.ctspace.xyz/api/captcha' target='_blank' rel='noreferrer'
                                       style={{color: primary, fontWeight:600}}>https://forum.ctspace.xyz/api/captcha</a></li>
                            <li>全选 → 复制 JSON</li>
                            <li>回到这里粘贴 → 点「解析」</li>
                        </ol>
                        <textarea style={{...S.textarea, minHeight:80, width:'100%', fontFamily:'monospace', fontSize:11, marginTop:8}}
                                  placeholder='粘贴 forum.ctspace.xyz/api/captcha 返回的 JSON…'
                                  value={this.state.pasteJson}
                                  onChange={e=>this.setState({pasteJson: e.target.value, pasteErr:''})} />
                        {this.state.pasteErr && <div style={S.err}>{this.state.pasteErr}</div>}
                        <div style={{display:'flex', gap:8, marginTop:8}}>
                            <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._parsePastedCaptcha()}>确定</button>
                            <button style={cls(S.btn, S.btnGhost)} onClick={()=>this.setState({pasteJson:'', pasteErr:''})}>清空</button>
                        </div>
                    </div>
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
        );
    }

    _renderPublish(S, C) {
        const catLabel = c => `${c.zh} / ${c.en}`;
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.hint}>
                        <AlertCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color:'#f59e0b'}} />
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
            </div>
        );
    }

    _renderMine(S) {
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
                            <span style={{color:'#999', fontSize:11, marginLeft:6}}>({p.category})</span>
                        </span>
                        <span style={{fontSize:11, color:'#888'}}>
                            <Heart size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color:'#64748b'}} /> {p.likeCount||0}
                            · <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px', color:'#64748b'}} /> {p.views||0}
                        </span>
                        {p.shortLinkSlug && (
                            <a href={`https://forum.ctspace.xyz/g/${p.shortLinkSlug}`} target='_blank' rel='noreferrer'
                               style={{fontSize:11}}>试玩</a>
                        )}
                    </div>
                ))}
            </div>
        );
    }
}

export default RwckPublishPanel;
export {CATEGORIES};
