/**
 * 创客次元发布窗口主界面。
 *
 * 三个 Tab：
 *   [登录] — 图文验证码 + PoW（自动算）+ 账号密码
 *   [发布作品] — 封面 / sb3 上传 / 分类 / 简介 / 允许下载
 *   [发帖]     — 正文 Markdown / 附件引用
 *   [我的作品] — 快速更新版本 / 删 / 开短链
 *
 * 主题色：所有 color 都来自 props.colors.primary（从编辑器当前主题读的 --ui-primary）。
 */

import React, {Component} from 'react';
import rwck from './api-client.js';

const PAD = 14;

const STYLE = colors => ({
    root: {padding: PAD, display:'flex', flexDirection:'column', gap:10, height:'100%', minHeight:0},
    titleRow: {display:'flex', alignItems:'center', gap:10},
    brandDot: {width:10, height:10, borderRadius:50, background: colors.primary},
    tabs: {display:'flex', borderBottom:'1px solid #ddd', gap:4},
    tab: {padding:'8px 14px', cursor:'pointer', borderRadius:'6px 6px 0 0',
          border:'1px solid transparent', background:'transparent', fontSize:13, fontWeight:600},
    tabActive: {background:'#fff', borderColor:'#ddd', borderBottomColor:'#fff',
                color: colors.primary},
    body: {flex:1, overflow:'auto', padding:'10px 2px', display:'flex', flexDirection:'column', gap:10},
    row: {display:'flex', gap:8, alignItems:'center'},
    label: {fontSize:12, color:'#555', minWidth:90},
    input: {flex:1, padding:'6px 8px', border:'1px solid #ccc', borderRadius:6, fontSize:13},
    textarea:{flex:1, padding:'6px 8px', border:'1px solid #ccc', borderRadius:6, fontSize:13, minHeight:90, resize:'vertical'},
    btn: {padding:'7px 14px', borderRadius:6, border:'none', fontSize:13, fontWeight:600, cursor:'pointer',
          transition:'opacity .15s ease, transform .08s ease', outline:'none'},
    btnActive: {transform:'translateY(1px)'},
    btnDisabledBase: {cursor:'not-allowed'},
    primary: {background: colors.primary, color:'#fff'},
    primaryDisabled: {background: colors.primary, color:'#fff', opacity:.55, cursor:'not-allowed'},
    ghost:   {background:'transparent', border:'1px solid #ccc', color:'#333'},
    ghostDisabled: {opacity:.55, cursor:'not-allowed'},
    danger:  {background:'#e74c3c', color:'#fff'},
    box:     {border:'1px solid #eee', borderRadius:8, padding:10, background:'#fafafa'},
    captcha: {border:'1px solid #ddd', borderRadius:6, padding:6, background:'#fff', height:52, cursor:'pointer'},
    hint:    {fontSize:11, color:'#888', lineHeight:1.4},
    err:     {color:'#c0392b', fontSize:12, padding:'6px 8px', background:'#fdecea', borderRadius:6},
    ok:      {color:'#27ae60', fontSize:12, padding:'6px 8px', background:'#eaf7ef', borderRadius:6},
    listItem:{display:'flex', alignItems:'center', gap:8, padding:'6px 8px', border:'1px solid #eee',
              borderRadius:6, fontSize:13},
    switchOn: {background: colors.primary},
    switchOff:{background:'#ccc'},
    avatar:   {width:22, height:22, borderRadius:11, background:'#ddd'},
    scrollbar:{},
    fileInfo: {fontSize:11, color:'#666'},
    sectionTitle:{fontSize:12, fontWeight:700, color: colors.primary, marginTop:4}
});

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
        this.state = {
            tab: token ? 'publish' : 'login',
            user: rwck.authState().user,

            // ---- 登录 ----
            captcha: null,
            captchaLoading: true, // 是否正在自动拉取验证码（用于显示占位）
            captchaLoadErr: '',   // 自动拉取验证码失败时显示的友好提示
            showPaste: false,    // 是否显示「手动粘贴 JSON」面板
            pasteJson: '',       // 用户粘贴的原始 JSON 文本
            pasteErr: '',        // 粘贴解析错误
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
            mine: []
        };
        this._refreshCaptcha();
    }

    componentDidMount() { this._refreshMine(); }

    // ========== 验证码 ==========
    async _refreshCaptcha() {
        this.setState({captchaLoading: true, captchaLoadErr: ''});
        try {
            const cap = await rwck.auth.getCaptcha();
            console.debug('[rwck] captcha loaded:', {
                hasImage: !!(cap && cap.image),
                imagePrefix: (cap && cap.image && typeof cap.image === 'string') ? cap.image.slice(0, 30) : null,
                token: cap && cap.token,
                pow: cap && cap.pow
            });
            this.setState({captcha: cap, captchaAnswer: '', loginErr: '', captchaLoading: false, captchaLoadErr: ''});
        } catch (e) {
            console.error('[rwck] captcha load failed:', e);
            // 自动拉取失败时不立刻弹致命错误，给用户留「手动粘贴 JSON」兜底入口
            this.setState({captcha: null, captchaLoading: false,
                           captchaLoadErr: '自动拉取验证码失败（可能是同源代理未生效），请点下方「手动粘贴」链接'});
        }
    }

    /**
     * 手动粘贴 forum.ctspace.xyz/api/captcha 返回的 JSON，绕过 CORS / 代理问题。
     * 用户操作：浏览器开 https://forum.ctspace.xyz/api/captcha → 全选 → 复制 → 粘贴到 textarea → 点「解析」。
     */
    _parsePastedCaptcha() {
        const raw = (this.state.pasteJson || '').trim();
        if (!raw) {
            this.setState({pasteErr: '请先粘贴 JSON'}); return;
        }
        let data;
        try { data = JSON.parse(raw); }
        catch { this.setState({pasteErr: 'JSON 格式不对，请确认复制的是完整 JSON'}); return; }
        if (!data.token || !data.image) {
            this.setState({pasteErr: 'JSON 里没找到 token / image 字段'}); return;
        }
        // 兜底：有些论坛返回 image 是裸 base64，补上 data:image/png;base64,
        let image = data.image;
        if (typeof image === 'string' && !image.startsWith('data:image')) {
            image = 'data:image/png;base64,' + image;
        }
        const cap = {
            token: data.token,
            image,
            pow: data.pow || {challenge: '', difficulty: data.difficulty || 4}
        };
        this.setState({
            captcha: cap, captchaAnswer: '', pasteErr: '',
            pasteJson: '', showPaste: false, loginErr: ''
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
        } catch (e) {
            this.setState({loginErr: e.message || '登录失败', loginBusy:false});
            this._refreshCaptcha();
        } finally {
            this.setState({loginBusy:false});
        }
    }

    _logout() {
        rwck.auth.logout();
        this.setState({user:null, tab:'login', uploadErr:'', uploadOk:'', publishErr:'', publishOk:''});
    }

    // ========== 作品上传辅助 ==========
    async _loadSb3FromVm () {
        const vm = this.props.getVm && this.props.getVm();
        if (!vm || !vm.saveProjectSb3) {
            this.setState({publishErr:'当前编辑器环境不支持导出 .sb3（找不到 vm.saveProjectSb3）'});
            return null;
        }
        // scratch-gui 里 vm.saveProjectSb3() 或 vm.exportProject() 返回 Blob / Uint8Array
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
            const body = {
                title: this.state.title,
                summary: this.state.summary,
                content: this.state.content,
                category: this.state.category,
                fileResourceId: sb3.id,
                coverResourceId: coverResourceId,
                allowDownload: this.state.allowDownload,
                syncToForum: this.state.syncToForum,
                forumTagIds: []
            };
            const proj = await rwck.projects.create(body);
            this.setState({
                publishOk: `发布成功！作品编号 ${proj.id}，短链 https://forum.ctspace.xyz/g/${proj.shortLinkSlug || '?'}`,
                uploadBusy:false, uploadProgress:'', sb3File:null, sb3ResourceId:null, sb3Name:'',
                coverFile:null, coverResourceId:null, title:'', summary:'', content:''
            });
            this._refreshMine();
        } catch (e) {
            this.setState({uploadBusy:false, publishErr: e.message || '发布失败', uploadProgress:''});
        }
    }

    // ========== 发帖 ==========
    async _postDiscussion() {
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
        } catch (e) {
            this.setState({discussionBusy:false, discussionErr: e.message || '发帖失败'});
        }
    }

    // ========== 我的作品 ==========
    async _refreshMine() {
        if (!rwck.authState().token) return;
        this.setState({myBusy:true, myErr:''});
        try {
            const r = await rwck.projects.mine();
            this.setState({mine: Array.isArray(r) ? r : (r && r.items) || [], myBusy:false});
        } catch (e) {
            this.setState({myErr: e.message || '获取失败', myBusy:false});
        }
    }

    // ========== 渲染 ==========
    render() {
        const C = this.props.colors || {primary:'#4c97ff', secondary:'#333'};
        const S = STYLE(C);
        const isLoggedIn = !!this.state.user;
        const tabs = [
            {id:'login',    label: this.state.user ? '账户' : '登录'},
            {id:'publish',  label: '发布作品'},
            {id:'disc',     label: '发帖'},
            {id:'mine',     label: '我的作品'}
        ];

        return (
            <div style={S.root}>
                <div style={S.titleRow}>
                    <span style={S.brandDot} />
                    <strong style={{fontSize:15}}>创客次元 · 极光论坛</strong>
                    <span style={{flex:1}} />
                    {this.state.user ? (
                        <span style={{fontSize:12, color:'#666'}}>
                            {this.state.user.username}
                            <button style={S.ghost} onClick={()=>this._logout()} title='退出登录'>退出</button>
                        </span>
                    ) : null}
                </div>

                <div style={S.tabs}>
                    {tabs.map(t => (
                        <button key={t.id}
                                style={cls(S.tab, this.state.tab===t.id && S.tabActive)}
                                onClick={()=>this.setState({tab:t.id})}>{t.label}</button>
                    ))}
                </div>

                <div style={S.body}>
                    {this._renderTab(S, C, isLoggedIn)}
                </div>
            </div>
        );
    }

    _renderTab(S, C, isLoggedIn) {
        const t = this.state.tab;
        if (t === 'login')    return this._renderLogin(S);
        if (!isLoggedIn)      return this._renderLogin(S);
        if (t === 'publish')  return this._renderPublish(S, C);
        if (t === 'disc')     return this._renderDisc(S);
        if (t === 'mine')     return this._renderMine(S);
        return null;
    }

    _renderLogin(S) {
        const {captcha} = this.state;
        const primary = this.props.colors.primary;
        const hasImage = !!captcha;

        // 登录按钮是否禁用：正在登录 or 没填全账号/密码/验证码
        const loginDisabled = this.state.loginBusy || !this.state.username || !this.state.password
                              || !captcha || !this.state.captchaAnswer;

        return (
            <div style={S.box}>
                <div style={S.sectionTitle}>登录 / 注册</div>
                <div style={S.hint}>首次使用请先去官网注册账号（需验证邮箱）。</div>
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

                {/* ====== 图形验证码（默认可见） ====== */}
                <div style={S.row}>
                    <label style={S.label}>图形验证码（6 位）</label>

                    {/* 状态占位：加载中 / 已加载出图 / 拉取失败 */}
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

                    <button style={cls(S.btn, S.ghost, this.state.captchaLoading && S.ghostDisabled)}
                            onClick={()=>this._refreshCaptcha()}
                            disabled={this.state.captchaLoading}
                            title='重新获取验证码'>
                        {this.state.captchaLoading ? '加载中…' : '换一张'}
                    </button>
                </div>

                {/* ====== 折叠式「手动粘贴」兜底 ====== */}
                <div style={{marginTop:2}}>
                    <a role='button' onClick={()=>this.setState(s=>({showPaste: !s.showPaste, pasteErr:''}))}
                       style={{...S.hint, color: primary, fontWeight:600, cursor:'pointer', textDecoration:'underline', border:'none', background:'transparent', padding:0}}>
                        {this.state.showPaste ? '▲ 收起手动粘贴面板' : '▼ 不显示验证码图片？点这里手动粘贴'}
                    </a>
                    {this.state.captchaLoadErr && !hasImage && (
                        <div style={{...S.err, marginTop:6}}>{this.state.captchaLoadErr}</div>
                    )}
                </div>

                {this.state.showPaste && (
                    <div style={{...S.box, background:'#fff', border:'1px dashed #bbb', marginTop:6}}>
                        <ol style={{margin:0, paddingLeft:20, ...S.hint}}>
                            <li>
                                点链接在新标签打开 →
                                <a href='https://forum.ctspace.xyz/api/captcha' target='_blank' rel='noreferrer'
                                   style={{color: primary, fontWeight:600}}>
                                   https://forum.ctspace.xyz/api/captcha
                                </a>
                            </li>
                            <li>在新标签里按 <b>Ctrl+A</b> 全选 → <b>Ctrl+C</b> 复制</li>
                            <li>回到这里粘贴到下方 → 点「确定」</li>
                        </ol>
                        <textarea
                            style={{...S.textarea, minHeight:80, width:'100%', fontFamily:'monospace', fontSize:11, marginTop:8}}
                            placeholder='粘贴 forum.ctspace.xyz/api/captcha 返回的 JSON…'
                            value={this.state.pasteJson}
                            onChange={e=>this.setState({pasteJson: e.target.value, pasteErr:''})}
                        />
                        {this.state.pasteErr && <div style={S.err}>{this.state.pasteErr}</div>}
                        <div style={{display:'flex', gap:8, marginTop:8}}>
                            <button style={cls(S.btn, S.primary)} onClick={()=>this._parsePastedCaptcha()}>
                                确定（自动显示图片）
                            </button>
                            <button style={S.ghost} onClick={()=>this.setState({pasteJson:'', pasteErr:''})}>清空</button>
                            <button style={S.ghost} onClick={()=>window.open('https://forum.ctspace.xyz/api/captcha', '_blank')}>
                                打开接口
                            </button>
                        </div>
                    </div>
                )}

                {hasImage && (
                    <div style={{...S.hint, padding:'0 90px'}}>
                        PoW 工作量证明会在点击登录时自动计算（几毫秒）
                    </div>
                )}
                <div style={{...S.row, paddingLeft:90}}>
                    <button style={cls(S.btn, S.primary, loginDisabled && S.primaryDisabled)}
                            disabled={loginDisabled}
                            onClick={()=>this._login()}>
                        {this.state.loginBusy ? '登录中…' : '登录'}
                    </button>
                </div>
            </div>
        );
    }

    _renderPublish(S, C) {
        const catLabel = c => `${c.zh} / ${c.en}`;
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.hint}>
                    上传即视为您的作品同意被别人下载，上传至创客次元社区后，创客次元无法绝对保证您的作品不被别人下载或改编。
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
                    <button style={S.ghost} onClick={()=>this._loadSb3FromVm()}>从当前编辑器读取</button>
                    <span style={S.fileInfo}>或</span>
                    <label style={S.ghost}>
                        手动选择
                        <input type='file' accept='.sb3' style={{display:'none'}}
                               onChange={e=>this._pickSb3(e)} />
                    </label>
                    {this.state.sb3Name && <span style={S.fileInfo}>已选：{this.state.sb3Name}</span>}
                </div>
                <div style={S.row}>
                    <label style={S.label}>封面图（可选）</label>
                    <label style={S.ghost}>
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
                    <button style={cls(S.btn, S.primary, this.state.uploadBusy && S.primaryDisabled)}
                            disabled={this.state.uploadBusy}
                            onClick={()=>this._upload()}>
                        {this.state.uploadBusy ? '上传中…' : '上传并发布'}
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
                <div style={S.hint}>发帖限流 4 条/小时。帖子正文支持 Markdown，附件走云盘 / resources 上传后在正文里引用。</div>
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
                    <button style={cls(S.btn, S.primary, this.state.discussionBusy && S.primaryDisabled)}
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
                    <button style={S.ghost} onClick={()=>this._refreshMine()}>刷新</button>
                </div>
                {this.state.myErr && <div style={S.err}>{this.state.myErr}</div>}
                {this.state.myBusy && <div style={S.ok}>加载中…</div>}
                {!this.state.myBusy && this.state.mine.length === 0 && (
                    <div style={S.hint}>还没有发布过作品，快去「发布作品」Tab 发第一个吧～</div>
                )}
                {this.state.mine.map(p => (
                    <div key={p.id} style={S.listItem}>
                        <span style={{flex:1}}>{p.title} <span style={{color:'#999', fontSize:11}}>({p.category})</span></span>
                        <span style={{fontSize:11, color:'#888'}}>❤{p.likeCount|0} · 👁{p.views|0}</span>
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
