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
    AlertCircle, CheckCircle, LogIn, LogOut, AlertTriangle,
    Activity, Tag, Globe,
    Search, Bell, Key, ShieldCheck, Package, HardDrive,
    ThumbsUp, Smile, Bookmark, UserPlus, Send, ExternalLink,
    Plus, Trash2, Star, Hash, Compass, Layers,
    Database, Zap, FileText, Wrench, XCircle, Settings
} from 'lucide-react';
import {makeT} from '../mw/mw-l10n.js';
const rwckT = makeT({
    rwck1: {en: ' min ago', 'zh-cn': ' 分钟前', geng: ' 分钟前嗷', wenyan: ' 分前'},
    rwck2: {en: ' d ago', 'zh-cn': ' 天前', geng: ' 天前嗷', wenyan: ' 日前'},
    rwck3: {en: ' h ago', 'zh-cn': ' 小时前', geng: ' 小时前嗷', wenyan: ' 时前'},
    rwck4: {en: 'JS source of the Scratch extension…', 'zh-cn': 'Scratch 扩展的 JS 源码…', geng: 'Scratch 扩展的 JS 源码嗷…', wenyan: 'Scratch 延伸之 JS 源…'},
    rwck5: {en: '\\n\\nClick', 'zh-cn': '\\n\\n点', geng: '\\n\\n点一下嗷', wenyan: '\\n\\n按'},
    rwck6: {en: '[MakerVerse Upload Notice]\\n\\n', 'zh-cn': '【创客次元上传须知】\\n\\n', geng: '【创客次元上传须知】\\n\\n', wenyan: '【创客次元上传须諭】\\n\\n'},
    rwck7: {en: 'One-line intro, optional, ≤500 chars', 'zh-cn': '一句话简介，可选，≤500 字', geng: '一句话简介，随便写，≤500 字嗷', wenyan: '一言以介，可略，不过五百字'},
    rwck8: {en: 'Uploading…', 'zh-cn': '上传中…', geng: '上传中嗷…', wenyan: '传之中…'},
    rwck9: {en: 'Uploading .sb3…', 'zh-cn': '上传作品 .sb3…', geng: '上传作品 .sb3 嗷…', wenyan: '传 .sb3 之中…'},
    rwck10: {en: 'Uploading cover…', 'zh-cn': '上传封面…', geng: '上传封面嗷…', wenyan: '传封面之中…'},
    rwck11: {en: 'Upload & Publish', 'zh-cn': '上传并发布', geng: '上传并发布嗷', wenyan: '上传而布'},
    rwck12: {en: 'Cloud Variables', 'zh-cn': '云变量', geng: '云变量', wenyan: '云中变数'},
    rwck13: {en: 'Cloud variable project created', 'zh-cn': '云变量项目已创建', geng: '云变量项目建好啦', wenyan: '云变数之卷已成'},
    rwck14: {en: 'Interactions', 'zh-cn': '互动', geng: '互动', wenyan: '相与'},
    rwck15: {en: "Today's visits", 'zh-cn': '今日访问', geng: '今日访问嗷', wenyan: '今日之览'},
    rwck16: {en: 'Reading current project from editor…', 'zh-cn': '从编辑器读取当前作品…', geng: '从编辑器读作品嗷…', wenyan: '自编辑器读今之卷…'},
    rwck17: {en: 'Proxy prefix cannot be empty', 'zh-cn': '代理前缀不能为空', geng: '代理前缀不能为空嗷', wenyan: '代理之前缀不可空'},
    rwck18: {en: 'Proxy prefix must start with http:// or https://', 'zh-cn': '代理前缀必须以 http:// 或 https:// 开头', geng: '代理前缀得用 http:// 或 https:// 开头嗷', wenyan: '代理前缀当以 http:// 或 https:// 始'},
    rwck19: {en: 'Project uploaded', 'zh-cn': '作品上传完成', geng: '作品传完啦', wenyan: '卷已传毕'},
    rwck20: {en: 'Project uploaded', 'zh-cn': '作品已上传', geng: '作品传好啦', wenyan: '卷已上传'},
    rwck21: {en: 'Project Plaza', 'zh-cn': '作品广场', geng: '作品广场', wenyan: '作之场'},
    rwck22: {en: 'e.g. 123', 'zh-cn': '例如 123', geng: '比如 123 嗷', wenyan: '譬如一二三'},
    rwck23: {en: 'Save failed: ', 'zh-cn': '保存失败：', geng: '保存砸了：', wenyan: '存之未成：'},
    rwck24: {en: 'Get captcha first', 'zh-cn': '先获取验证码', geng: '先拿验证码嗷', wenyan: '先取验符'},
    rwck25: {en: 'Close', 'zh-cn': '关闭', geng: '关掉嗷', wenyan: '闭'},
    rwck26: {en: 'Dismiss', 'zh-cn': '关闭提示', geng: '关掉提示嗷', wenyan: '去其示'},
    rwck27: {en: 'Write a comment…', 'zh-cn': '写点评论…', geng: '写点评论嗷…', wenyan: '书评…'},
    rwck28: {en: 'Preparing…', 'zh-cn': '准备中…', geng: '准备中嗷…', wenyan: '备之中…'},
    rwck29: {en: 'just now', 'zh-cn': '刚刚', geng: '刚刚嗷', wenyan: '方才'},
    rwck30: {en: 'MakerVerse Settings', 'zh-cn': '创客次元设置', geng: '创客次元设置', wenyan: '创客次元之设'},
    rwck31: {en: 'MakerVerse Settings (CORS proxy / network log)', 'zh-cn': '创客次元设置（CORS 代理 / 网络日志）', geng: '创客次元设置（CORS 代理 / 网络日志）', wenyan: '创客次元之设（CORS 代理 / 网志）'},
    rwck32: {en: 'Delete', 'zh-cn': '删除', geng: '删掉嗷', wenyan: '删'},
    rwck33: {en: 'Delete project', 'zh-cn': '删除作品', geng: '删掉作品嗷', wenyan: '删其卷'},
    rwck34: {en: 'Animation', 'zh-cn': '动画', geng: '动画', wenyan: '戏'},
    rwck35: {en: 'Anonymous', 'zh-cn': '匿名', geng: '匿名', wenyan: '无名'},
    rwck36: {en: 'means you have read and agree to the terms above.\\n(You will only be reminded once per window / per day)', 'zh-cn': '即表示您已阅读并同意以上条款。\\n（同一窗口 / 同一天内只会再提醒一次）', geng: '就是说你看过并同意上面这些啦。\\n（同一个窗口 / 同一天只再提醒一次嗷）', wenyan: '即汝已读而诺其上之约。\\n（同窗 / 同日仅再警一次）'},
    rwck37: {en: 'Originality Registration', 'zh-cn': '原创登记', geng: '原创登记', wenyan: '原创之登'},
    rwck38: {en: 'Publish Project', 'zh-cn': '发布作品', geng: '发布作品', wenyan: '布其卷'},
    rwck39: {en: 'Post', 'zh-cn': '发布帖子', geng: '发帖嗷', wenyan: '发帖'},
    rwck40: {en: 'Post / Reply', 'zh-cn': '发帖/回复', geng: '发帖/回复', wenyan: '帖与对'},
    rwck41: {en: 'Posting…', 'zh-cn': '发帖中…', geng: '发帖中嗷…', wenyan: '发帖之中…'},
    rwck42: {en: 'Reply posted', 'zh-cn': '回复已发布', geng: '回复发好啦', wenyan: '对已成'},
    rwck43: {en: 'Copy failed, please select the text manually', 'zh-cn': '复制失败，请手动选文本', geng: '复制没成，手动选一下文本嗷', wenyan: '复制未成，请手择其文'},
    rwck44: {en: 'API key created', 'zh-cn': '密钥已创建', geng: '密钥建好啦', wenyan: '密钥已成'},
    rwck45: {en: 'Will upload the selected file', 'zh-cn': '将以上传选中文件', geng: '会把选中的文件传上去嗷', wenyan: '将传所选之文'},
    rwck46: {en: 'Will export the current editor project', 'zh-cn': '将导出当前编辑器作品', geng: '会把当前编辑器里的作品导出来嗷', wenyan: '将出今编辑器之卷'},
    rwck47: {en: 'Restored defaults', 'zh-cn': '已恢复默认', geng: '恢复默认啦', wenyan: '复其初'},
    rwck48: {en: 'Bookmarked', 'zh-cn': '已收藏', geng: '收藏好啦', wenyan: '已藏'},
    rwck49: {en: 'Total posts', 'zh-cn': '帖子总数', geng: '帖子总数', wenyan: '帖之凡'},
    rwck50: {en: 'Applying…', 'zh-cn': '应用中…', geng: '应用着呢嗷…', wenyan: '用之中…'},
    rwck51: {en: 'Developer', 'zh-cn': '开发者', geng: '开发者', wenyan: '作者'},
    rwck52: {en: 'Current editor environment does not support .sb3 export', 'zh-cn': '当前编辑器环境不支持导出 .sb3', geng: '当前编辑器不支持导出 .sb3 嗷', wenyan: '今之编辑器不支持出 .sb3'},
    rwck53: {en: 'Restore default https://cors-api.rewp.de5.net ?', 'zh-cn': '恢复默认 https://cors-api.rewp.de5.net ？', geng: '恢复默认 https://cors-api.rewp.de5.net 嗷？', wenyan: '复其初 https://cors-api.rewp.de5.net ？'},
    rwck54: {en: 'My Drive', 'zh-cn': '我的云盘', geng: '我的云盘', wenyan: '吾之盘'},
    rwck55: {en: 'My Projects', 'zh-cn': '我的作品', geng: '我的作品', wenyan: '吾之卷'},
    rwck56: {en: 'Extension published', 'zh-cn': '扩展已发布', geng: '扩展发布好啦', wenyan: '延伸已布'},
    rwck57: {en: 'Extension Plaza', 'zh-cn': '扩展广场', geng: '扩展广场', wenyan: '延伸之场'},
    rwck58: {en: 'Probe done, but some endpoints failed', 'zh-cn': '探测完成，但有接口失败', geng: '探测完啦，但有接口没成', wenyan: '探已毕，然有端未成'},
    rwck59: {en: 'Submitting project info…', 'zh-cn': '提交作品信息…', geng: '提交作品信息嗷…', wenyan: '呈卷之讯…'},
    rwck60: {en: 'Search', 'zh-cn': '搜索', geng: '搜索', wenyan: '索'},
    rwck61: {en: 'Search projects / discussions / users…', 'zh-cn': '搜索作品 / 讨论 / 用户…', geng: '搜索作品 / 讨论 / 用户嗷…', wenyan: '索卷 / 议 / 人…'},
    rwck62: {en: 'Search project title…', 'zh-cn': '搜索作品标题…', geng: '搜索作品标题嗷…', wenyan: '索卷之名…'},
    rwck63: {en: 'Story', 'zh-cn': '故事', geng: '故事', wenyan: '事'},
    rwck64: {en: 'Tutorial', 'zh-cn': '教程', geng: '教程', wenyan: '教'},
    rwck65: {en: 'Log copied to clipboard', 'zh-cn': '日志已复制到剪贴板', geng: '日志复制到剪贴板啦', wenyan: '志已录于 clipboard'},
    rwck66: {en: 'Log cleared', 'zh-cn': '日志已清空', geng: '日志清空啦', wenyan: '志已空'},
    rwck67: {en: 'Unknown error', 'zh-cn': '未知错误', geng: '不知啥错', wenyan: '未知之误'},
    rwck68: {en: 'View variables', 'zh-cn': '查看变量', geng: '看看变量嗷', wenyan: '视其变数'},
    rwck69: {en: 'Tag created', 'zh-cn': '标签已创建', geng: '标签建好啦', wenyan: '标已成'},
    rwck70: {en: 'Mark as read', 'zh-cn': '标记已读', geng: '标成已读嗷', wenyan: '记为已读'},
    rwck71: {en: 'Both title and code are required', 'zh-cn': '标题和代码都要填', geng: '标题和代码都得填嗷', wenyan: '题与码皆须填'},
    rwck72: {en: 'Loading…', 'zh-cn': '正在加载…', geng: '加载着呢嗷…', wenyan: '载之中…'},
    rwck73: {en: 'Registered users', 'zh-cn': '注册用户', geng: '注册用户', wenyan: '注籍之人'},
    rwck74: {en: 'Game', 'zh-cn': '游戏', geng: '游戏', wenyan: '戏'},
    rwck75: {en: 'Click to refresh', 'zh-cn': '点一下刷新', geng: '点一下刷新嗷', wenyan: '按以更'},
    rwck76: {en: 'Like', 'zh-cn': '点赞', geng: '点赞', wenyan: '善'},
    rwck77: {en: 'Like / Unlike', 'zh-cn': '点赞 / 取消点赞', geng: '点赞 / 取消点赞', wenyan: '善 / 去善'},
    rwck78: {en: 'Log in', 'zh-cn': '登录', geng: '登录嗷', wenyan: '入'},
    rwck79: {en: 'Logging in…', 'zh-cn': '登录中…', geng: '登录着呢嗷…', wenyan: '入之中…'},
    rwck80: {en: 'Target ID and comment are both required', 'zh-cn': '目标 ID 和评论内容都要填', geng: '目标 ID 和评论都得填嗷', wenyan: '标的之 ID 与评皆须填'},
    rwck81: {en: 'Delete project #{id}? This cannot be undone.', 'zh-cn': '确定删除作品 #${id}？此操作不可撤销。', geng: '确定删掉作品 #{id} 嗷？删了找不回来哦', wenyan: '决删卷 #{id} 乎？此不可复也。'},
    rwck82: {en: 'Delete extension #{id}?', 'zh-cn': '确定删除扩展 #${id}？', geng: '确定删掉扩展 #{id} 嗷？', wenyan: '决删延伸 #{id} 乎？'},
    rwck83: {en: 'Delete this file?', 'zh-cn': '确定删除这个文件？', geng: '确定删掉这个文件嗷？', wenyan: '决删此文乎？'},
    rwck84: {en: 'Confirm changes', 'zh-cn': '确认修改', geng: '确认修改嗷', wenyan: '诺其改'},
    rwck85: {en: 'Community Status', 'zh-cn': '社区状态', geng: '社区状态', wenyan: '社之状'},
    rwck86: {en: 'Community has no tags yet', 'zh-cn': '社区还没有标签', geng: '社区还没有标签嗷', wenyan: '社尚无标'},
    rwck87: {en: 'Loading…', 'zh-cn': '等待加载', geng: '等着加载嗷…', wenyan: '待载'},
    rwck88: {en: 'Netdisk resource registered', 'zh-cn': '网盘资源已登记', geng: '网盘资源登记好啦', wenyan: '网盘之资已登'},
    rwck89: {en: 'Network error: browser cannot reach forum.ctspace.xyz, please check your connection and retry.', 'zh-cn': '网络错误：浏览器无法连接 forum.ctspace.xyz，请检查网络后重试。', geng: '网络出错：连不上 forum.ctspace.xyz 嗷，检查下网络再试', wenyan: '网误：浏览器不能至 forum.ctspace.xyz，请察网而重试。'},
    rwck90: {en: 'Art', 'zh-cn': '美术', geng: '美术', wenyan: '画'},
    rwck91: {en: 'Failed to fetch community status', 'zh-cn': '获取社区状态失败', geng: '拿社区状态没成', wenyan: '取社之状未成'},
    rwck92: {en: 'Failed to fetch discussion list', 'zh-cn': '获取讨论列表失败', geng: '拿讨论列表没成', wenyan: '取议之目未成'},
    rwck93: {en: 'Reaction submitted', 'zh-cn': '表态已提交', geng: '表态交好啦', wenyan: '其态已呈'},
    rwck94: {en: 'Discussion ID and reply are both required', 'zh-cn': '讨论 ID 和回复内容都要填', geng: '讨论 ID 和回复都得填嗷', wenyan: '议之 ID 与对皆须填'},
    rwck95: {en: 'Thread', 'zh-cn': '讨论串', geng: '讨论串', wenyan: '议之串'},
    rwck96: {en: 'Visit forum home', 'zh-cn': '访问论坛首页', geng: '去论坛首页嗷', wenyan: '诣论坛之首'},
    rwck97: {en: 'Comment posted', 'zh-cn': '评论已发布', geng: '评论发好啦', wenyan: '评已成'},
    rwck98: {en: 'Detailed intro, how-to-play, changelog……', 'zh-cn': '详细介绍、玩法说明、更新日志……', geng: '详细介绍、玩法说明、更新日志啥的……', wenyan: '详介、玩法、更录……'},
    rwck99: {en: 'Please log in first', 'zh-cn': '请先登录', geng: '先登录嗷', wenyan: '请先入'},
    rwck100: {en: 'Select a project and enter a variable name first', 'zh-cn': '请先选项目并填变量名', geng: '先选项目再填变量名嗷', wenyan: '先择卷而书名'},
    rwck101: {en: 'Fill in account / password / captcha completely', 'zh-cn': '请填完整账号 / 密码 / 验证码', geng: '账号 / 密码 / 验证码都得填嗷', wenyan: '账号 / 密 / 验符皆须填'},
    rwck102: {en: 'Enter the bookmark target ID', 'zh-cn': '请填收藏目标 ID', geng: '填一下收藏目标 ID 嗷', wenyan: '书标的之 ID'},
    rwck103: {en: 'Enter title and content', 'zh-cn': '请填标题和内容', geng: '标题和内容都得填嗷', wenyan: '题与文皆须填'},
    rwck104: {en: 'Enter the like target ID', 'zh-cn': '请填点赞目标 ID', geng: '填一下点赞目标 ID 嗷', wenyan: '善标的之 ID'},
    rwck105: {en: 'Enter the target ID', 'zh-cn': '请填目标 ID', geng: '填一下目标 ID 嗷', wenyan: '书标的之 ID'},
    rwck106: {en: 'Enter the netdisk link', 'zh-cn': '请填网盘链接', geng: '填一下网盘链接嗷', wenyan: '书网盘之链'},
    rwck107: {en: 'Enter keywords', 'zh-cn': '请输入关键词', geng: '输入关键词嗷', wenyan: '输入关键词'},
    rwck108: {en: 'Enter key name', 'zh-cn': '请输入密钥名称', geng: '输入密钥名称嗷', wenyan: '书名钥'},
    rwck109: {en: 'Enter tag name', 'zh-cn': '请输入标签名', geng: '输入标签名嗷', wenyan: '书名标'},
    rwck110: {en: 'Enter username', 'zh-cn': '请输入用户名', geng: '输入用户名嗷', wenyan: '书名'},
    rwck111: {en: 'Enter registration number', 'zh-cn': '请输入登记号', geng: '输入登记号嗷', wenyan: '书登之号'},
    rwck112: {en: 'Enter project name', 'zh-cn': '请输入项目名', geng: '输入项目名嗷', wenyan: '书卷之名'},
    rwck113: {en: 'Failed to read current project: ', 'zh-cn': '读取当前作品失败：', geng: '读当前作品没成：', wenyan: '读今之卷未成：'},
    rwck114: {en: 'Resource', 'zh-cn': '资源', geng: '资源', wenyan: '资'},
    rwck115: {en: 'Enter the characters in the image', 'zh-cn': '输入图中字符', geng: '把图里的字输进去嗷', wenyan: '书图中之字'},
    rwck116: {en: 'Log out', 'zh-cn': '退出登录', geng: '退出登录嗷', wenyan: '出'},
    rwck117: {en: 'Notifications / Check-in', 'zh-cn': '通知/签到', geng: '通知/签到', wenyan: '告 / 至'},
    rwck118: {en: 'Re-probe', 'zh-cn': '重新探测', geng: '重新探测嗷', wenyan: '复探'},
    rwck119: {en: 'Refresh captcha', 'zh-cn': '重新获取验证码', geng: '重新拿验证码嗷', wenyan: '复取验符'},
    rwck120: {en: 'Music', 'zh-cn': '音乐', geng: '音乐', wenyan: '音'},
    rwck121: {en: 'Default from current editor project name', 'zh-cn': '默认从当前编辑器作品名取', geng: '默认用当前编辑器作品名嗷', wenyan: '初以今编辑器之卷名'},
    rwck122: {en: '(checked in today)', 'zh-cn': '（今天已签到）', geng: '（今天签过到啦）', wenyan: '（今日已至）'},
    rwck123: {en: 'Uploaded ${name}', 'zh-cn': '已上传 ${f.name}', geng: '上传好啦 ${name}', wenyan: '已传 ${name}'},
    rwck124: {en: 'Uploaded, resource ID ${id}', 'zh-cn': '已上传，资源 ID ${r.id}', geng: '传好啦，资源 ID ${id}', wenyan: '已传，资 ID ${id}'},
    rwck125: {en: 'Followed tag #${name}', 'zh-cn': '已关注标签 #${first.name}', geng: '关注了标签 #${name}', wenyan: '已随标 #${name}'},
    rwck126: {en: 'Toggled follow on ${name}', 'zh-cn': '已切换对 ${name} 的关注', geng: '切换了关注 ${name}', wenyan: '更其随 ${name}'},
    rwck127: {en: 'Set ${name}', 'zh-cn': '已设置 ${cloudVarName}', geng: '设好啦 ${name}', wenyan: '已置 ${name}'},
    rwck128: {en: 'Probe done, took {ms} ms', 'zh-cn': '探测完成，耗时 {ms} ms', geng: '探测完啦，用了 {ms} ms', wenyan: '探毕，历 {ms} 毫秒'},
    rwck129: {en: 'Bookmark status: ${json}', 'zh-cn': '收藏状态：${JSON.stringify(r)}', geng: '收藏状态：${json}', wenyan: '藏之状：${json}'},
    rwck130: {en: 'Registration #${id}', 'zh-cn': '登记 #${g.id}', geng: '登记 #${id}', wenyan: '登 #${id}'},
    rwck131: {en: 'Registration ${cert} verified', 'zh-cn': '登记号 ${cert} 校验完成', geng: '登记号 ${cert} 校验好啦', wenyan: '登 ${cert} 验毕'},
    rwck132: {en: 'Resource ${id}', 'zh-cn': '资源 ${r.id}', geng: '资源 ${id}', wenyan: '资 ${id}'},
    rwck133: {en: '.sb3 Project', 'zh-cn': '.sb3 作品', geng: '.sb3 作品', wenyan: '.sb3 之卷'},
    rwck134: {en: 'API Key', 'zh-cn': 'API 密钥', geng: 'API 密钥', wenyan: 'API 密钥'},
    rwck135: {en: 'CORS proxy prefix', 'zh-cn': 'CORS 代理前缀', geng: 'CORS 代理前缀', wenyan: 'CORS 代理之前缀'},
    rwck136: {en: 'CORS proxy note: ', 'zh-cn': 'CORS 代理说明：', geng: 'CORS 代理说明：', wenyan: 'CORS 代理之注：'},
    rwck137: {en: 'PoW is auto-computed when you click log in (a few ms)', 'zh-cn': 'PoW 会在点击登录时自动计算（几毫秒）', geng: '点登录时会自动算 PoW（几毫秒）', wenyan: '按登录则自动算 PoW（数毫秒）'},
    rwck138: {en: '.\n                        Official default: ', 'zh-cn': '。\n                        官方默认：', geng: '。\n                        官方默认：', wenyan: '。\n                        官方之初：'},
    rwck139: {en: 'Upload to drive', 'zh-cn': '上传到云盘', geng: '传到云盘', wenyan: '传于盘'},
    rwck140: {en: 'Upload resource', 'zh-cn': '上传资源', geng: '上传资源', wenyan: '传资'},
    rwck141: {en: 'Read from editor', 'zh-cn': '从编辑器读取', geng: '从编辑器读', wenyan: '自编辑器读'},
    rwck142: {en: 'Proxy prefix', 'zh-cn': '代理前缀', geng: '代理前缀', wenyan: '代理前缀'},
    rwck143: {en: 'May pause for maintenance/update from time to time; please understand.', 'zh-cn': '会不定时的进行暂停服务、更新，请注意谅解。', geng: '会不定时暂停服务或更新，多包涵嗷', wenyan: '或不时休止而更之，望见谅。'},
    rwck144: {en: 'Project', 'zh-cn': '作品', geng: '作品', wenyan: '卷'},
    rwck145: {en: 'Project info', 'zh-cn': '作品信息', geng: '作品信息', wenyan: '卷之讯'},
    rwck146: {en: 'Value', 'zh-cn': '值', geng: '值', wenyan: '值'},
    rwck147: {en: 'Allow others to download', 'zh-cn': '允许他人下载', geng: '允许别人下载', wenyan: '许人下载'},
    rwck148: {en: 'All', 'zh-cn': '全部', geng: '全部', wenyan: '凡'},
    rwck149: {en: 'All categories', 'zh-cn': '全部分类', geng: '全部分类', wenyan: '诸类'},
    rwck150: {en: 'Mark all read', 'zh-cn': '全部已读', geng: '全部已读', wenyan: '悉记为读'},
    rwck151: {en: 'All extensions', 'zh-cn': '全部扩展', geng: '全部扩展', wenyan: '诸延伸'},
    rwck152: {en: 'Follow', 'zh-cn': '关注', geng: '关注', wenyan: '随'},
    rwck153: {en: 'Follow / Unfollow', 'zh-cn': '关注 / 取关', geng: '关注 / 取关', wenyan: '随 / 去随'},
    rwck154: {en: 'Follow first tag', 'zh-cn': '关注第一个标签', geng: '关注第一个标签', wenyan: '随首标'},
    rwck155: {en: 'Other', 'zh-cn': '其它', geng: '其它', wenyan: '他'},
    rwck156: {en: 'Write', 'zh-cn': '写入', geng: '写入', wenyan: '书'},
    rwck157: {en: 'Category', 'zh-cn': '分类', geng: '分类', wenyan: '类'},
    rwck158: {en: 'MakerVerse API did not respond', 'zh-cn': '创客次元 API 未回', geng: '创客次元 API 没回', wenyan: '创客次元 API 未应'},
    rwck159: {en: 'MakerVerse · Aurora Forum', 'zh-cn': '创客次元 · 极光论坛', geng: '创客次元 · 极光论坛', wenyan: '创客次元 · 极光之坛'},
    rwck160: {en: 'MakerVerse Community', 'zh-cn': '创客次元 社区', geng: '创客次元 社区', wenyan: '创客次元 之社'},
    rwck161: {en: 'Create', 'zh-cn': '创建', geng: '创建', wenyan: '创'},
    rwck162: {en: 'Refresh', 'zh-cn': '刷新', geng: '刷新', wenyan: '更'},
    rwck163: {en: 'Load', 'zh-cn': '加载', geng: '加载', wenyan: '载'},
    rwck164: {en: 'Loading…', 'zh-cn': '加载中…', geng: '加载中嗷…', wenyan: '载之中…'},
    rwck165: {en: 'Load failed', 'zh-cn': '加载失败', geng: '加载没成', wenyan: '载未成'},
    rwck166: {en: 'Go post your first one →', 'zh-cn': '去发第一个吧 →', geng: '去发第一个吧 →', wenyan: '往发其首 →'},
    rwck167: {en: 'Before publishing, confirm your work follows the community guidelines. Uploading means you agree others may download it.', 'zh-cn': '发布前确认作品内容符合社区公约。上传即视为您的作品同意被别人下载。', geng: '发布前确认符合社区公约。上传即视为同意别人下载。', wenyan: '布前请确其合社约。上传即许人下载。'},
    rwck168: {en: 'Publish extension', 'zh-cn': '发布扩展', geng: '发布扩展', wenyan: '布延伸'},
    rwck169: {en: 'Post rate limit: 4/hour. Body supports Markdown and can reference drive resources.', 'zh-cn': '发帖限流 4 条/小时。正文支持 Markdown，可引用云盘资源。', geng: '发帖限流 4 条/小时。正文支持 Markdown，能引用云盘资源。', wenyan: '发帖限每时四。正文用 Markdown，可引盘资。'},
    rwck170: {en: 'Post comment', 'zh-cn': '发表评论', geng: '发表评论', wenyan: '发评'},
    rwck171: {en: 'Cancel', 'zh-cn': '取消', geng: '取消', wenyan: '却'},
    rwck172: {en: 'Changelog', 'zh-cn': '变更日志', geng: '变更日志', wenyan: '更录'},
    rwck173: {en: 'Variable name', 'zh-cn': '变量名', geng: '变量名', wenyan: '变数之名'},
    rwck174: {en: 'Sync to forum post', 'zh-cn': '同步到论坛帖子', geng: '同步到论坛帖子', wenyan: '同于论坛之帖'},
    rwck175: {en: 'Name', 'zh-cn': '名称', geng: '名称', wenyan: '名'},
    rwck176: {en: 'Reply', 'zh-cn': '回复', geng: '回复', wenyan: '对'},
    rwck177: {en: 'Reply content', 'zh-cn': '回复内容', geng: '回复内容', wenyan: '对之文'},
    rwck178: {en: 'Reply to existing thread (POST /posts)', 'zh-cn': '回复已有讨论（POST /posts）', geng: '回复已有讨论（POST /posts）', wenyan: '对既议（POST /posts）'},
    rwck179: {en: 'Image captcha', 'zh-cn': '图形验证码', geng: '图形验证码', wenyan: '图验'},
    rwck180: {en: 'Log in inside editor', 'zh-cn': '在编辑器内登录', geng: '在编辑器里登录', wenyan: '于编辑器内入'},
    rwck181: {en: 'Log in on forum', 'zh-cn': '在论坛中登录', geng: '在论坛登录', wenyan: '于论坛入'},
    rwck182: {en: 'Processing…', 'zh-cn': '处理中…', geng: '处理中嗷…', wenyan: '处之中…'},
    rwck183: {en: 'Copy', 'zh-cn': '复制', geng: '复制', wenyan: '录'},
    rwck184: {en: 'Password', 'zh-cn': '密码', geng: '密码', wenyan: '密'},
    rwck185: {en: 'Cover image (optional)', 'zh-cn': '封面图（可选）', geng: '封面图（可选）', wenyan: '封面（可略）'},
    rwck186: {en: 'Rewarded resources', 'zh-cn': '已获赏资源', geng: '已获赏资源', wenyan: '已赏之资'},
    rwck187: {en: 'Post', 'zh-cn': '帖子', geng: '帖子', wenyan: '帖'},
    rwck188: {en: 'e.g.', 'zh-cn': '形如', geng: '形如', wenyan: '譬如'},
    rwck189: {en: 'Restore default', 'zh-cn': '恢复默认', geng: '恢复默认', wenyan: '复其初'},
    rwck190: {en: 'My published projects', 'zh-cn': '我发布的作品', geng: '我发布的作品', wenyan: '吾所布之卷'},
    rwck191: {en: 'My published extensions', 'zh-cn': '我发布的扩展', geng: '我发布的扩展', wenyan: '吾所布之延伸'},
    rwck192: {en: 'My cloud projects', 'zh-cn': '我的云项目', geng: '我的云项目', wenyan: '吾之云卷'},
    rwck193: {en: 'My registrations', 'zh-cn': '我的登记', geng: '我的登记', wenyan: '吾之登'},
    rwck194: {en: 'or', 'zh-cn': '或', geng: '或', wenyan: '或'},
    rwck195: {en: 'Choose manually', 'zh-cn': '手动选择', geng: '手动选', wenyan: '手择'},
    rwck196: {en: 'Open', 'zh-cn': '打开', geng: '打开', wenyan: '开'},
    rwck197: {en: 'Extension', 'zh-cn': '扩展', geng: '扩展', wenyan: '延伸'},
    rwck198: {en: 'Leaderboard', 'zh-cn': '排行榜', geng: '排行榜', wenyan: '榜'},
    rwck199: {en: 'Extraction code', 'zh-cn': '提取码', geng: '提取码', wenyan: '取码'},
    rwck200: {en: 'Searching…', 'zh-cn': '搜索中…', geng: '搜索中嗷…', wenyan: '索之中…'},
    rwck201: {en: 'Bookmark', 'zh-cn': '收藏', geng: '收藏', wenyan: '藏'},
    rwck202: {en: 'File', 'zh-cn': '文件', geng: '文件', wenyan: '文'},
    rwck203: {en: 'New', 'zh-cn': '新建', geng: '新建', wenyan: '新'},
    rwck204: {en: 'New cloud variable project', 'zh-cn': '新建云变量项目', geng: '新建云变量项目', wenyan: '新云变数之卷'},
    rwck205: {en: 'No data', 'zh-cn': '暂无数据', geng: '还没数据', wenyan: '无数据'},
    rwck206: {en: 'No discussions yet, ', 'zh-cn': '暂无讨论，', geng: '还没讨论，', wenyan: '尚无议，'},
    rwck207: {en: 'No requests yet. After you log in / publish / post, all sent and received data shows here.', 'zh-cn': '暂无请求。触发登录 / 发布 / 发帖后，这里会显示所有发送与接收。', geng: '暂无请求。登录 / 发布 / 发帖后，这里会显示所有收发。', wenyan: '尚无请。既入 / 布 / 发之后，此处示其收发。'},
    rwck208: {en: 'Latest', 'zh-cn': '最新', geng: '最新', wenyan: '新'},
    rwck209: {en: 'Latest discussions', 'zh-cn': '最新讨论', geng: '最新讨论', wenyan: '近议'},
    rwck210: {en: 'Hottest', 'zh-cn': '最热', geng: '最热', wenyan: '热'},
    rwck211: {en: 'Check bookmark status', 'zh-cn': '查收藏状态', geng: '查收藏状态', wenyan: '察藏之状'},
    rwck212: {en: 'View all →', 'zh-cn': '查看全部 →', geng: '查看全部 →', wenyan: '视其全 →'},
    rwck213: {en: 'Tag name', 'zh-cn': '标签名', geng: '标签名', wenyan: '标之名'},
    rwck214: {en: 'Title *', 'zh-cn': '标题 *', geng: '标题 *', wenyan: '题 *'},
    rwck215: {en: 'Verify', 'zh-cn': '校验', geng: '校验', wenyan: '验'},
    rwck216: {en: 'Verify registration number', 'zh-cn': '校验登记号', geng: '校验登记号', wenyan: '验登之号'},
    rwck217: {en: 'Fetching…', 'zh-cn': '正在获取…', geng: '获取中嗷…', wenyan: '取之中…'},
    rwck218: {en: 'Body *', 'zh-cn': '正文 *', geng: '正文 *', wenyan: '文 *'},
    rwck219: {en: 'Body (Markdown)', 'zh-cn': '正文（Markdown）', geng: '正文（Markdown）', wenyan: '文（Markdown）'},
    rwck220: {en: 'Daily check-in', 'zh-cn': '每日签到', geng: '每日签到', wenyan: '每日之至'},
    rwck221: {en: 'No projects found', 'zh-cn': '没有找到作品', geng: '没找到作品', wenyan: '未得卷'},
    rwck222: {en: 'Register', 'zh-cn': '注册', geng: '注册', wenyan: '注'},
    rwck223: {en: 'Active users', 'zh-cn': '活跃用户', geng: '活跃用户', wenyan: '活跃之人'},
    rwck224: {en: 'Clear', 'zh-cn': '清空', geng: '清空', wenyan: '空'},
    rwck225: {en: 'Source', 'zh-cn': '源码', geng: '源码', wenyan: '源'},
    rwck226: {en: 'Source *', 'zh-cn': '源码 *', geng: '源码 *', wenyan: '源 *'},
    rwck227: {en: 'Like / Unlike', 'zh-cn': '点赞 / 取消', geng: '点赞 / 取消', wenyan: '善 / 去善'},
    rwck228: {en: 'Like / React / Bookmark', 'zh-cn': '点赞 / 表态 / 收藏', geng: '点赞 / 表态 / 收藏', wenyan: '善 / 态 / 藏'},
    rwck229: {en: 'Hot tags', 'zh-cn': '热门标签', geng: '热门标签', wenyan: '热标'},
    rwck230: {en: 'User', 'zh-cn': '用户', geng: '用户', wenyan: '人'},
    rwck231: {en: 'Username', 'zh-cn': '用户名', geng: '用户名', wenyan: '人名'},
    rwck232: {en: 'Username / Email', 'zh-cn': '用户名 / 邮箱', geng: '用户名 / 邮箱', wenyan: '人名 / 邮'},
    rwck233: {en: 'by', 'zh-cn': '由', geng: '由', wenyan: '自'},
    rwck234: {en: 'Log in to MakerVerse', 'zh-cn': '登录创客次元', geng: '登录创客次元', wenyan: '入创客次元'},
    rwck235: {en: 'Register', 'zh-cn': '登记', geng: '登记', wenyan: '登'},
    rwck236: {en: 'Registration number', 'zh-cn': '登记号', geng: '登记号', wenyan: '登之号'},
    rwck237: {en: 'Register netdisk resource', 'zh-cn': '登记网盘资源', geng: '登记网盘资源', wenyan: '登网盘之资'},
    rwck238: {en: 'Target ID', 'zh-cn': '目标 ID', geng: '目标 ID', wenyan: '标的之 ID'},
    rwck239: {en: 'Target type', 'zh-cn': '目标类型', geng: '目标类型', wenyan: '标之型'},
    rwck240: {en: 'Direct link', 'zh-cn': '直链', geng: '直链', wenyan: '直链'},
    rwck241: {en: 'Community tags', 'zh-cn': '社区标签', geng: '社区标签', wenyan: '社之标'},
    rwck242: {en: 'Site overview', 'zh-cn': '站点总览', geng: '站点总览', wenyan: '站之览'},
    rwck243: {en: 'Check-in', 'zh-cn': '签到', geng: '签到', wenyan: '至'},
    rwck244: {en: 'Intro', 'zh-cn': '简介', geng: '简介', wenyan: '介'},
    rwck245: {en: 'Network request log (send / receive / error)', 'zh-cn': '网络请求日志（发送 / 接收 / 错误）', geng: '网络请求日志（发送 / 接收 / 错误）', wenyan: '网请之志（发 / 收 / 误）'},
    rwck246: {en: 'React', 'zh-cn': '表态', geng: '表态', wenyan: '态'},
    rwck247: {en: 'Discussion', 'zh-cn': '讨论', geng: '讨论', wenyan: '议'},
    rwck248: {en: 'Discussion ID', 'zh-cn': '讨论 ID', geng: '讨论 ID', wenyan: '议之 ID'},
    rwck249: {en: 'Settings', 'zh-cn': '设置', geng: '设置', wenyan: '设'},
    rwck250: {en: 'Exit', 'zh-cn': '退出', geng: '退出', wenyan: '出'},
    rwck251: {en: 'No account yet? Registration is on the community site', 'zh-cn': '还没有账号？注册需要转到社区官网', geng: '还没账号？注册要去社区官网', wenyan: '未注籍？注册于社之官网'},
    rwck252: {en: 'on the site.', 'zh-cn': '页面注册。', geng: '页面注册。', wenyan: '于页注册。'},
    rwck253: {en: "Haven't published yet? Go to the Publish tab and post your first one~", 'zh-cn': '还没有发布过作品，快去「发布作品」Tab 发第一个吧～', geng: '还没发过作品？去「发布作品」Tab 发第一个吧～', wenyan: '未布乎？往发布之Tab发其首～'},
    rwck254: {en: ', will be appended automatically', 'zh-cn': '，会自动追加', geng: '，会自动追加', wenyan: '，自附'},
    rwck255: {en: 'Play', 'zh-cn': '试玩', geng: '试玩', wenyan: '试'},
    rwck256: {en: 'Choose image', 'zh-cn': '选择图片', geng: '选图片', wenyan: '择图'},
    rwck257: {en: 'Choose file', 'zh-cn': '选择文件', geng: '选文件', wenyan: '择文'},
    rwck258: {en: 'Link', 'zh-cn': '链接', geng: '链接', wenyan: '链'},
    rwck259: {en: 'Comments', 'zh-cn': '评论', geng: '评论', wenyan: '评'},
    rwck260: {en: 'Notifications', 'zh-cn': '通知', geng: '通知', wenyan: '告'},
    rwck261: {en: 'Project name', 'zh-cn': '项目名', geng: '项目名', wenyan: '卷名'},
    rwck262: {en: 'Set variable', 'zh-cn': '设置变量', geng: '设置变量', wenyan: '置变数'},
    rwck400: {"en": "By uploading you agree that others may download your work.\nAfter publishing to the CTSpace community, CTSpace cannot absolutely guarantee your work won't be downloaded or adapted by others.\nPlease confirm your work complies with the platform community guidelines before publishing.", 'zh-cn': "上传即表示你同意他人下载你的作品。\\n发布到创客次元后，社区也无法绝对保证作品不被他人下载或改编。\\n发布前请确认作品内容符合平台社区公约。", "geng": "上传啦就代表你默许别人下你的作品哦～\n发到创客次元后，本社区也无法绝对保证没人下走或二改。\n发布前请确认内容符合社区公约嗷。", "wenyan": "既上传，则许人下载矣。\n既布于创客次元，彼亦难保无人取下或改之。\n布前请审其合于公约。"},
    rwck401: {"en": "Click \"OK\" to indicate you have read and agree to the above terms.\n(This reminder shows at most once per window / per day.)", 'zh-cn': "点“确定”表示你已阅读并同意以上条款。\\n（同一窗口 / 同一天内最多提醒一次。）", "geng": "点“确定”就代表你已经看完并同意上面这些条条啦～\n（同一窗口 / 同一天内就只提醒这么一回）", "wenyan": "点“确定”者，视作已读而许之。\n（同窗／同日，仅一示之）"},
    rwck402: {"en": "Re-probing…", 'zh-cn': "正在重新探测…", "geng": "重新探测中…", "wenyan": "复探中"},
    rwck403: {"en": "Failed to auto-fetch captcha: {msg}. Click the refresh button on the right to retry.", 'zh-cn': "自动获取验证码失败：{msg}。请点右侧刷新按钮重试。", "geng": "自动拉验证码翻车啦：{msg}。点右边刷新钮再试试捏～", "wenyan": "自动取验失败：{msg}。请点右涮钮重试。"},
    rwck404: {"en": "Fill in account / password / captcha", 'zh-cn': "请填完整账号 / 密码 / 验证码", "geng": "账号 / 密码 / 验证码 都要填嗷", "wenyan": "账号、密码、验码皆须填"},
    rwck405: {"en": "Published! Work #{id}, play link https://forum.ctspace.xyz/g/{slug}", 'zh-cn': "发布成功！作品编号 {id}，试玩短链 https://forum.ctspace.xyz/g/{slug}", "geng": "发布成功！作品编号 {id}，试玩短链 https://forum.ctspace.xyz/g/{slug}", "wenyan": "布成！编号 {id}，试玩 https://forum.ctspace.xyz/g/{slug}"},
    rwck406: {"en": "Fill in title and content", 'zh-cn': "标题和内容都要填", "geng": "标题和内容都要填嗷", "wenyan": "题与文皆须填"},
    rwck407: {"en": "Posted! Thread #{seq}", 'zh-cn': "发帖成功！帖子 #{seq}", "geng": "发帖成功！帖子 #{seq}", "wenyan": "帖成！第 {seq} 帖"},
    rwck408: {"en": "Probing…", 'zh-cn': "探测中…", "geng": "探测中…", "wenyan": "探中"},
    rwck409: {"en": "Connected, latency {ms} ms", 'zh-cn': "连通，耗时 {ms} ms", "geng": "连通，耗时 {ms} ms", "wenyan": "通，迟 {ms} 毫"},
    rwck410: {"en": "Online now: {n}", 'zh-cn': "当前在线 {n} 人", "geng": "当前在线 {n} 人", "wenyan": "今在线 {n} 人"},
    rwck411: {"en": "Where do you want to log in? You can enter account & password directly in the editor;", 'zh-cn': "想在哪里登录？可以直接在编辑器内填写账号密码；", "geng": "想在哪儿登录？在编辑器里直接填账号密码也行嗷；", "wenyan": "欲于何處登？在編內直填賬密亦可；"},
    rwck412: {"en": "or jump to the forum web login (which carries the matching entry parameters).", 'zh-cn': "也可以跳转到论坛网页登录（会带上对应的入口参数）。", "geng": "也可以跳去论坛网页登录（会带好对应的入口参数捏）。", "wenyan": "或往論壇網頁登（自带其入口參）。"},
    rwck413: {"en": "First-time use: register on the official site (email verification required). Login goes through a graphical captcha + a frontend-computed PoW proof-of-work.", 'zh-cn': "首次使用请先到官网注册账号（需要邮箱验证）。登录需通过图形验证码 + 前端计算的 PoW 工作量证明。", "geng": "首次用请先去官网注册账号（要验邮箱嗷）。登录会先过图形验证码 + 前端自动算的 PoW 工作量证明。", "wenyan": "初用宜先於官網註冊（須驗郵）。登時先過圖驗，加以前端自算之 PoW 證。"},
    rwck414: {"en": "Selected: {name}", 'zh-cn': "已选：{name}", "geng": "已选：{name}", "wenyan": "已选：{name}"},
    rwck415: {"en": "Both discussion ID and reply content are required", 'zh-cn': "讨论 ID 和回复内容都要填", "geng": "讨论 ID 和回复内容都要填嗷", "wenyan": "议 ID 与回复皆须填"},
    rwck416: {"en": "Both title and code are required", 'zh-cn': "标题和代码都要填", "geng": "标题和代码都要填嗷", "wenyan": "题与码皆须填"},
    rwck417: {"en": "Used {n} /", 'zh-cn': "已用 {n} /", "geng": "已用 {n} /", "wenyan": "用 {n} /"},
    rwck418: {"en": "After upload it can be referenced as an attachment (resources/{id})", 'zh-cn': "上传后可作为附件引用（resources/{id}）", "geng": "上传后可作为附件引用（resources/{id}）", "wenyan": "上传后可作附引（resources/{id}）"},
    rwck419: {"en": "Enter a target ID", 'zh-cn': "请填目标 ID", "geng": "请填目标 ID 嗷", "wenyan": "须填标的 ID"},
    rwck420: {"en": "Like toggled", 'zh-cn': "已切换点赞状态", "geng": "已切换点赞状态捏", "wenyan": "赞态已易"},
    rwck421: {"en": "Checked in for {n} consecutive days", 'zh-cn': "连续签到 {n} 天", "geng": "连续签到 {n} 天", "wenyan": "连签 {n} 日"},
    rwck422: {"en": "(checked in today)", 'zh-cn': "（今天已签到）", "geng": "（今天已签到）", "wenyan": "（今日已签）"},
    rwck423: {"en": "Please log in first", 'zh-cn': "请先登录", "geng": "请先登录嗷", "wenyan": "请先登"},
    rwck424: {"en": "Error: {msg}", 'zh-cn': "错误：{msg}", "geng": "错误：{msg}", "wenyan": "误：{msg}"},
    rwck425: {"en": "Applying…", 'zh-cn': "正在应用…", "geng": "正在应用…", "wenyan": "施中"},
    rwck426: {"en": "Saved. Most interfaces take effect immediately;\nrefresh the page to fully switch (incl. BASE_URL).", 'zh-cn': "已保存。大部分接口会立即生效；\\n如需完全切换（含 BASE_URL），请刷新页面。", "geng": "已保存。大部分接口会立即生效；\n如需完全切换（含 BASE_URL），请刷新页面。", "wenyan": "已存。多口即效；\n欲全切（含 BASE_URL）请涮页。"},
    rwck427: {"en": ", the editor forwards all requests through the official CORS proxy by default.", 'zh-cn': "，编辑器默认通过官方 CORS 代理转发所有请求。", "geng": "，编辑器已默认通过官方 CORS 代理转发所有请求。", "wenyan": "，編輯器默以官 CORS 代理轉諸請。"},
    rwck428: {"en": "Usually keep the default; if a Tab keeps loading / erroring,", 'zh-cn': "一般保持默认即可；若某个标签页一直加载 / 报错，", "geng": "一般保持默认即可，遇到某 Tab 一直 loading / 报错时，", "wenyan": "常守默认；若某页久载或报错，"},
    rwck429: {"en": "switch the \"CORS proxy prefix\" below back to the official address or your own proxy.", 'zh-cn': "再把下方「CORS 代理前缀」改回官方地址或填你自己的代理。", "geng": "再把下方「CORS 代理前缀」换回官方地址或填你自己的代理。", "wenyan": "下方「CORS 代理前缀」改回官址或自代理。"},
    rwck430: {"en": "Usually keep the default; switch to your own cors-anywhere instance only when cross-origin issues occur.", 'zh-cn': "。一般保持默认即可，遇到跨域问题时再换成你自己部署的 cors-anywhere 实例。", "geng": "。一般保持默认即可，遇到跨域时再换成你自己部署的 cors-anywhere 实例。", "wenyan": "。常守默认，遇跨域方易为己部署之 cors-anywhere。"},
    rwck431: {"en": "Applying…", 'zh-cn': "应用中…", "geng": "应用中…", "wenyan": "施中"},
    rwck432: {"en": "CTSpace Upload Notice", 'zh-cn': "创客次元上传须知", "geng": "创客次元上传须知", "wenyan": "创客次元上传之告"}
});


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
    footer: {paddingTop:8, display:'flex', flexDirection:'column', gap:6, flexShrink:0},
    footerBanner: {display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                   borderRadius: RADIUS_SM, fontSize:12, lineHeight:1.45,
                   background: C.warningSoft || '#fff7e6',
                   border:`1px solid ${C.warningBorder || '#ffd591'}`,
                   color: C.warning || '#d46b08'},
    footerBannerIcon: {flexShrink:0},

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
    {id:'game',     zh:rwckT('rwck74'),   en:'Game'},
    {id:'animation',zh:rwckT('rwck34'),   en:'Animation'},
    {id:'story',    zh:rwckT('rwck63'),   en:'Story'},
    {id:'music',    zh:rwckT('rwck120'),   en:'Music'},
    {id:'art',      zh:rwckT('rwck90'),   en:'Art'},
    {id:'tutorial', zh:rwckT('rwck64'),   en:'Tutorial'}
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
            // 底部服务状态横幅允许用户一键隐藏（会话级）
            footerHidden: sessionStorage.getItem('rwck:footer-hidden') === '1',

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
            checkinErr: '',

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
rwckT('rwck400');
        const ok = window.confirm(`${rwckT('rwck432')}

${terms}

${rwckT('rwck401')}`);
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
        this.setState({probeBusy: true, probeMsg: rwckT('rwck402'), statsErr: '',
            discussionsErr: '', leaderboardErr: '', activeErr: '', tagsErr: ''});

        const pStats = rwck.stats.public().then(r => {
            this.setState({stats: r});
            latencies.stats = Date.now();
        }).catch(e => {
            this.setState({statsErr: e.message || rwckT('rwck91')});
        });

        const pDiscs = rwck.discussions.list({page:1, pageSize:8, sort:'new'}).then(r => {
            this.setState({discussionsPreview: rwck.unwrapList(r)});
            latencies.disc = Date.now();
        }).catch(e => {
            this.setState({discussionsErr: e.message || rwckT('rwck92')});
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
            probeMsg: this.state.statsErr ? rwckT('rwck58') : rwckT('rwck128').replace('{ms}', this._communityLatencyMs)
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
            return rwckT('rwck89');
        }
        return (e && e.message) || rwckT('rwck67');
    }

    // ========== 验证码 ==========
    async _refreshCaptcha() {
        this.setState({captchaLoading: true, captchaLoadErr: ''});
        try {
            const cap = await rwck.auth.getCaptcha();
            this.setState({captcha: cap, captchaAnswer: '', loginErr: '', captchaLoading: false});
        } catch (e) {
            this.setState({captcha: null, captchaLoading: false,
                           captchaLoadErr: rwckT('rwck403').replace('{msg}', (e && e.message) || e)});
        }
    }

    // ========== 登录 ==========
    async _login() {
        const {username, password, captcha, captchaAnswer} = this.state;
        if (!username || !password || !captcha || !captchaAnswer) {
            this.setState({loginErr: rwckT('rwck404')});
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
            title: rwckT('rwck30'),
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
            this.setState({publishErr:rwckT('rwck52')});
            return null;
        }
        let blob;
        try {
            const result = await vm.saveProjectSb3();
            blob = result instanceof Blob ? result : new Blob([result], {type:'application/zip'});
        } catch (e) {
            this.setState({publishErr:rwckT('rwck113') + (e.message||e)});
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
        this.setState({uploadBusy:true, publishErr:'', publishOk:'', uploadProgress:rwckT('rwck28')});
        try {
            let sb3File = this.state.sb3File;
            if (!sb3File) {
                this.setState({uploadProgress:rwckT('rwck16')});
                sb3File = await this._loadSb3FromVm();
                if (!sb3File) { this.setState({uploadBusy:false, uploadProgress:''}); return; }
                this.setState({sb3File});
            }

            this.setState({uploadProgress:rwckT('rwck9')});
            const sb3 = await rwck.resources.upload(sb3File, this.state.sb3Name);
            this.setState({sb3ResourceId: sb3.id, uploadProgress:rwckT('rwck19')});

            let coverResourceId = this.state.coverResourceId;
            if (this.state.coverFile) {
                this.setState({uploadProgress:rwckT('rwck10')});
                const cover = await rwck.resources.upload(this.state.coverFile, this.state.coverFile.name);
                coverResourceId = cover.id;
                this.setState({coverResourceId});
            }

            if (!this.state.title) {
                const autoTitle = this._guessProjectTitle() || this.state.sb3Name.replace(/\.sb3$/i,'') || rwckT('rwck55');
                this.setState({title: autoTitle});
            }

            this.setState({uploadProgress:rwckT('rwck59')});
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
                publishOk: rwckT('rwck405').replace('{id}', proj.id).replace('{slug}', proj.shortLinkSlug || ''),
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
            this.setState({discussionErr:rwckT('rwck406'), discussionOk:''}); return;
        }
        this.setState({discussionBusy:true, discussionErr:'', discussionOk:''});
        try {
            const d = await rwck.discussions.create({title: discussionTitle, content: discussionContent});
            this.setState({
                discussionOk:rwckT('rwck407').replace('{seq}', d.seq || d.id),
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
    _hideFooter() {
        sessionStorage.setItem('rwck:footer-hidden', '1');
        this.setState({footerHidden: true});
    }

    render() {
        const C = this.props.colors || getEditorTheme();
        const S = STYLE(C);
        const tabs = [
            {id:'login',     icon: LogIn,          label: rwckT('rwck78')},
            {id:'community', icon: BarChart3,      label: rwckT('rwck85')},
            {id:'publish',   icon: Upload,         label: rwckT('rwck38')},
            {id:'disc',      icon: MessageCircle,  label: rwckT('rwck40')},
            {id:'mine',      icon: FolderOpen,     label: rwckT('rwck55')},
            {id:'works',     icon: Compass,        label: rwckT('rwck21')},
            {id:'ext',       icon: Package,        label: rwckT('rwck57')},
            {id:'drive',     icon: HardDrive,      label: rwckT('rwck54')},
            {id:'res',       icon: Layers,         label: rwckT('rwck114')},
            {id:'social',    icon: Users,          label: rwckT('rwck14')},
            {id:'notify',    icon: Bell,           label: rwckT('rwck117')},
            {id:'search',    icon: Search,         label: rwckT('rwck60')},
            {id:'orig',      icon: ShieldCheck,    label: rwckT('rwck37')},
            {id:'cloud',     icon: Database,       label: rwckT('rwck12')},
            {id:'dev',       icon: Wrench,         label: rwckT('rwck51')}
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
                    <strong style={{fontSize:15}}>{rwckT('rwck159')}</strong>
                    <span style={{flex:1}} />
                    {this.state.user ? (
                        <span style={{fontSize:12, color: C.textMuted}}>
                            {this.state.user.username}
                            <button style={cls(S.btn, S.btnGhost, {marginLeft:8})}
                                    onClick={()=>this._logout()} title={rwckT('rwck116')}>
                                <LogOut size={14} strokeWidth={2.2} /> {rwckT('rwck250')}
                            </button>
                        </span>
                    ) : null}
                    <button style={cls(S.btn, S.btnIcon, S.btnGhost)}
                            title={rwckT('rwck31')}
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

                {!this.state.footerHidden && (
                    <div style={S.footer}>
                        <div style={S.footerBanner}>
                            <AlertTriangle size={14} strokeWidth={2.2} style={S.footerBannerIcon} />
                            <span style={{flex:1}}><strong>{rwckT('rwck160')}</strong>{rwckT('rwck143')}</span>
                            <button title={rwckT('rwck25')} aria-label={rwckT('rwck26')}
                                    style={{background:'transparent',border:'none',cursor:'pointer',
                                            padding:6, marginLeft:4, minWidth:32, minHeight:32,
                                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                                            color: C.warning || '#d46b08', lineHeight:1,
                                            borderRadius:4, touchAction:'manipulation'}}
                                    onClick={this._hideFooter}
                                    onTouchEnd={(e) => {
                                        e.preventDefault();
                                        this._hideFooter();
                                    }}>
                                <XCircle size={14} strokeWidth={2.2} />
                            </button>
                        </div>
                    </div>
                )}

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
                        <strong style={{fontSize:14}}>{rwckT('rwck85')}</strong>
                        <span style={{flex:1}} />
                        <button style={cls(S.btn, S.btnGhost, this.state.probeBusy && S.btnDisabled)}
                                disabled={this.state.probeBusy}
                                onClick={()=>this._refreshCommunity()}>
                            <RefreshCw size={14} strokeWidth={2.2}
                                       style={{animation: this.state.probeBusy ? 'spin 1s linear infinite' : 'none'}} />
                            {this.state.probeBusy ? rwckT('rwck408') : rwckT('rwck118')}
                        </button>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center', fontSize:12}}>
                        {this.state.probeMsg && !this.state.statsErr && (
                            <span style={{color: C.textMuted}}>{this.state.probeMsg}</span>
                        )}
                        {latency != null && !this.state.statsErr && !this.state.probeBusy && (
                            <span style={{color: C.success}}>
                                <CheckCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                {rwckT('rwck409').replace('{ms}', latency)}
                            </span>
                        )}
                        {this.state.statsErr && (
                            <span style={{color: C.danger}}>
                                <AlertCircle size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} />
                                {this._friendlyError(this.state.statsErr)}
                            </span>
                        )}
                        {!latency && !this.state.statsErr && !this.state.statsBusy && (
                            <span style={{color: C.textMuted}}>{rwckT('rwck217')}</span>
                        )}
                    </div>
                </div>

                {/* 核心指标 */}
                {st && (
                    <div style={cls(S.box, {padding:14})}>
                        <div style={S.sectionTitle}>{rwckT('rwck242')}</div>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
                            {[
                                {label:rwckT('rwck73'),   value: st.users || 0,        icon: Users},
                                {label:rwckT('rwck49'),   value: st.posts || 0,        icon: MessageCircle},
                                {label:rwckT('rwck95'),     value: st.discussions || 0,  icon: BookOpen},
                                {label:rwckT('rwck15'),   value: st.todayVisits || 0,  icon: Activity}
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
                        <span style={{fontSize:12}}>{rwckT('rwck410').replace('{n}', this.state.onlineCount)}</span>
                    </div>
                )}

                {/* 两栏：最新讨论 + 活跃用户 / 排行榜 */}
                <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:10}}>
                    {/* 最新讨论 */}
                    <div style={S.box}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                            <div style={S.sectionTitle}>{rwckT('rwck209')}</div>
                            <a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'
                               style={{...S.hint, ...S.link}}>
                                {rwckT('rwck212')}
                            </a>
                        </div>
                        {this.state.discussionsErr && <div style={S.err}>{this.state.discussionsErr}</div>}
                        {!this.state.discussionsErr && (!discs || discs.length === 0) && (
                            <div style={S.hint}>{rwckT('rwck206')}<a href='https://forum.ctspace.xyz/d/new' target='_blank' rel='noreferrer'>{rwckT('rwck166')}</a></div>
                        )}
                        <div style={{display:'flex', flexDirection:'column', gap:6}}>
                            {discs.slice(0, 8).map((d, i) => {
                                const author = d.author || {nickname: null, username: rwckT('rwck35'), avatar: null};
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
                                                {rwckT('rwck233')} <b>{author.nickname || author.username || rwckT('rwck35')}</b>
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
                            <div style={S.sectionTitle}>{rwckT('rwck198')}</div>
                            {this.state.leaderboardErr && <div style={S.hint}>{rwckT('rwck165')}</div>}
                            {!this.state.leaderboardErr && board.length === 0 && <div style={S.hint}>{rwckT('rwck205')}</div>}
                            {board.slice(0, 5).map((u, i) => (
                                <div key={u.id || i}
                                     style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
                                             fontSize:13, borderBottom:`1px dashed ${C.border}`}}>
                                    <span style={{width:18, fontWeight:700, color: i<3 ? primary : C.textSubtle}}>#{i+1}</span>
                                    {u.avatar && (
                                        <img src={u.avatar} alt='' style={{width:22, height:22, borderRadius:11, border:`1px solid ${C.border}`}} />
                                    )}
                                    <span style={{flex:1, fontWeight:600}}>
                                        {u.nickname || u.username || rwckT('rwck35')}
                                    </span>
                                    <span style={{fontSize:11, color: C.textMuted}}>
                                        +{(u.points ?? u.score ?? 0)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={S.box}>
                            <div style={S.sectionTitle}>{rwckT('rwck223')}</div>
                            {this.state.activeErr && <div style={S.hint}>{rwckT('rwck165')}</div>}
                            {!this.state.activeErr && active.length === 0 && <div style={S.hint}>{rwckT('rwck205')}</div>}
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
                                        {u.nickname || u.username || rwckT('rwck35')}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {tags && tags.length > 0 && (
                            <div style={S.box}>
                                <div style={S.sectionTitle}>{rwckT('rwck229')}</div>
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
                        {key:'home',  icon: Globe,       text: rwckT('rwck96'), href: FORUM.home},
                        {key:'works', icon: FolderOpen,  text: rwckT('rwck21'),     href: FORUM.works},
                        {key:'ext',   icon: Package,     text: rwckT('rwck57'),     href: FORUM.extensions}
                    ].map(item => (
                        <a key={item.key}
                           href={item.href} target='_blank' rel='noreferrer'
                           style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}>
                            <item.icon size={14} strokeWidth={2.2} /> {item.text}
                        </a>
                    ))}
                    <button style={cls(S.btn, S.btnPrimary)}
                            onClick={()=>this.setState({authModal:'login'})}>
                        <LogIn size={14} strokeWidth={2.2} /> {rwckT('rwck78')}
                    </button>
                    <button style={cls(S.btn, S.btnGhost)}
                            onClick={e => { e.preventDefault(); window.open('https://forum.ctspace.xyz/?register=1','_blank','noopener,noreferrer'); }}>
                        <UserPlus size={14} strokeWidth={2.2} /> {rwckT('rwck222')}
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
                        {rwckT('rwck234')}
                    </div>
                    <div style={S.hint}>
                        {rwckT('rwck411')}
                        {rwckT('rwck412')}
                    </div>
                    <div style={S.modalActions}>
                        <button style={cls(S.btn, S.btnPrimary)}
                                onClick={()=>this.setState({authModal:null, tab:'login'})}>
                            <LogIn size={14} strokeWidth={2.2} /> {rwckT('rwck180')}
                        </button>
                        <a href={FORUM.login} target='_blank' rel='noreferrer'
                           style={cls(S.btn, S.btnGhost, {textDecoration:'none'})}
                           onClick={()=>this.setState({authModal:null})}>
                            <ExternalLink size={14} strokeWidth={2.2} /> {rwckT('rwck181')}
                        </a>
                    </div>
                    <div style={S.modalRow}>
                        <button style={cls(S.btn, S.btnGhost, {marginLeft:'auto'})}
                                onClick={()=>this.setState({authModal:null})}>
                            {rwckT('rwck171')}
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
            if (diff < 60) return rwckT('rwck29');
            if (diff < 3600) return Math.floor(diff / 60) + rwckT('rwck1');
            if (diff < 86400) return Math.floor(diff / 3600) + rwckT('rwck3');
            if (diff < 86400 * 7) return Math.floor(diff / 86400) + rwckT('rwck2');
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
                <div style={S.sectionTitle}>{rwckT('rwck78')}</div>
                <div style={S.hint}>{rwckT('rwck413')}</div>
                {this.state.loginErr && <div style={S.err}>{this.state.loginErr}</div>}
                {this.state.loginBusy && <div style={S.ok}>{rwckT('rwck79')}</div>}

                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck232')}</label>
                    <input style={S.input} value={this.state.username}
                           onChange={e=>this.setState({username:e.target.value})} autoComplete='username' />
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck184')}</label>
                    <input style={S.input} type='password' value={this.state.password}
                           onChange={e=>this.setState({password:e.target.value})} autoComplete='current-password' />
                </div>

                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck179')}</label>
                    <div style={{...S.captcha, display:'flex', alignItems:'center', justifyContent:'center',
                                  minWidth:140, color: C.textSubtle, fontSize:12}}>
                        {this.state.captchaLoading ? rwckT('rwck72')
                         : hasImage ? (
                            <img alt='captcha' style={{borderRadius:4, height:40, cursor:'pointer'}}
                                 src={captcha.image}
                                 onClick={()=>this._refreshCaptcha()}
                                 title={rwckT('rwck75')} />
                         ) : rwckT('rwck87')}
                    </div>

                    {/* 验证码为 6 位大写字母数字（文档旧版误写 4 位） */}
                    <input style={{...S.input, maxWidth:150}} value={this.state.captchaAnswer}
                           onChange={e=>this.setState({captchaAnswer:e.target.value})}
                           placeholder={hasImage ? rwckT('rwck115') : rwckT('rwck24')}
                           maxLength={6} disabled={!hasImage} />

                    <button style={cls(S.btn, S.btnGhost, this.state.captchaLoading && S.btnDisabled)}
                            onClick={()=>this._refreshCaptcha()}
                            disabled={this.state.captchaLoading}
                            title={rwckT('rwck119')}>
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
                        <LogIn size={14} strokeWidth={2.2} /> {this.state.loginBusy ? rwckT('rwck79') : rwckT('rwck78')}
                    </button>
                    <span style={S.hint}>{rwckT('rwck137')}</span>
                </div>
            </div>
            <div style={S.box}>
                <div style={S.hint}>
                    {rwckT('rwck251')}
                    <a href='https://forum.ctspace.xyz/?register=1'
                       target='_blank' rel='noreferrer'
                       style={{...S.link, marginLeft:3}}>https://forum.ctspace.xyz/?register=1</a>
                    {rwckT('rwck252')}
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
                    <Settings size={13} strokeWidth={2.2} /> {rwckT('rwck249')}
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
                        {rwckT('rwck167')}
                    </div>
                </div>
                {this.state.publishErr && <div style={S.err}>{this.state.publishErr}</div>}
                {this.state.publishOk  && <div style={S.ok}>{this.state.publishOk}</div>}

                <div style={S.sectionTitle}>{rwckT('rwck145')}</div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck214')}</label>
                    <input style={S.input} value={this.state.title}
                           onChange={e=>this.setState({title:e.target.value})}
                           placeholder={rwckT('rwck121')} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck157')}</label>
                    <select style={S.input} value={this.state.category}
                            onChange={e=>this.setState({category:e.target.value})}>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{catLabel(c)}</option>)}
                    </select>
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck244')}</label>
                    <input style={S.input} value={this.state.summary}
                           onChange={e=>this.setState({summary:e.target.value})}
                           placeholder={rwckT('rwck7')} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck219')}</label>
                    <textarea style={S.textarea} value={this.state.content}
                              onChange={e=>this.setState({content:e.target.value})}
                              placeholder={rwckT('rwck98')} />
                </div>

                <div style={S.sectionTitle}>{rwckT('rwck202')}</div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck133')}</label>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadSb3FromVm()}>
                        <FileCode size={14} strokeWidth={2.2} /> {rwckT('rwck141')}
                    </button>
                    <span style={S.fileInfo}>{rwckT('rwck194')}</span>
                    <label style={cls(S.btn, S.btnGhost)}>
                        {rwckT('rwck195')}
                        <input type='file' accept='.sb3' style={{display:'none'}}
                               onChange={e=>this._pickSb3(e)} />
                    </label>
                    {this.state.sb3Name && <span style={S.fileInfo}>{rwckT('rwck414').replace('{name}', this.state.sb3Name)}</span>}
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck185')}</label>
                    <label style={cls(S.btn, S.btnGhost)}>
                        {rwckT('rwck256')}
                        <input type='file' accept='image/*' style={{display:'none'}}
                               onChange={e=>this._pickCover(e)} />
                    </label>
                    {this.state.coverFile && <span style={S.fileInfo}>{rwckT('rwck414').replace('{name}', this.state.coverFile.name)}</span>}
                </div>

                <div style={S.sectionTitle}>{rwckT('rwck155')}</div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck147')}</label>
                    <input type='checkbox' checked={this.state.allowDownload}
                           onChange={e=>this.setState({allowDownload:e.target.checked})} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck174')}</label>
                    <input type='checkbox' checked={this.state.syncToForum}
                           onChange={e=>this.setState({syncToForum:e.target.checked})} />
                </div>

                {this.state.uploadProgress && <div style={S.ok}>{this.state.uploadProgress}</div>}
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnPrimary, this.state.uploadBusy && S.btnDisabled)}
                            disabled={this.state.uploadBusy}
                            onClick={()=>this._upload()}>
                        <Upload size={14} strokeWidth={2.2} /> {this.state.uploadBusy ? rwckT('rwck8') : rwckT('rwck11')}
                    </button>
                    <span style={S.fileInfo}>
                        {this.state.sb3ResourceId ? rwckT('rwck20') : this.state.sb3File ? rwckT('rwck45') : rwckT('rwck46')}
                    </span>
                </div>
            </div>
        );
    }

    _renderDisc(S) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.hint}>{rwckT('rwck169')}</div>
                </div>
                {this.state.discussionErr && <div style={S.err}>{this.state.discussionErr}</div>}
                {this.state.discussionOk  && <div style={S.ok}>{this.state.discussionOk}</div>}
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck214')}</label>
                    <input style={S.input} value={this.state.discussionTitle}
                           onChange={e=>this.setState({discussionTitle:e.target.value})} />
                </div>
                <div style={S.row}>
                    <label style={S.label}>{rwckT('rwck218')}</label>
                    <textarea style={S.textarea} value={this.state.discussionContent}
                              onChange={e=>this.setState({discussionContent:e.target.value})} />
                </div>
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnPrimary, this.state.discussionBusy && S.btnDisabled)}
                            disabled={this.state.discussionBusy}
                            onClick={()=>this._postDiscussion()}>
                        {this.state.discussionBusy ? rwckT('rwck41') : rwckT('rwck39')}
                    </button>
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck178')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck248')}</label>
                        <input style={S.input} value={this.state.replyDiscussionId}
                               onChange={e=>this.setState({replyDiscussionId: e.target.value})}
                               placeholder={rwckT('rwck22')} />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck177')}</label>
                        <textarea style={S.textarea} value={this.state.replyContent}
                                  onChange={e=>this.setState({replyContent: e.target.value})} />
                    </div>
                    {errBar(S, this.state.replyErr)}
                    {okBar(S, this.state.replyOk)}
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnPrimary, this.state.replyBusy && S.btnDisabled)}
                                disabled={this.state.replyBusy}
                                onClick={()=>this._postReply()}>
                            <Send size={14} strokeWidth={2.2} /> {rwckT('rwck176')}
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
            this.setState({replyErr: rwckT('rwck415')});
            return;
        }
        this.setState({replyBusy: true, replyErr: '', replyOk: ''});
        try {
            await rwck.posts.create({discussionId: replyDiscussionId, content: replyContent});
            this.setState({replyBusy: false, replyOk: rwckT('rwck42'), replyContent: ''});
        } catch (e) {
            this.setState({replyErr: this._friendlyError(e), replyBusy: false});
        }
    }

    _renderMine(S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>{rwckT('rwck190')}</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._refreshMine()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                </div>
                {this.state.myErr && <div style={S.err}>{this.state.myErr}</div>}
                {this.state.myBusy && <div style={S.ok}>{rwckT('rwck164')}</div>}
                {!this.state.myBusy && this.state.mine.length === 0 && (
                    <div style={S.hint}>{rwckT('rwck253')}</div>
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
                               style={{...S.link, fontSize:11}}>{rwckT('rwck255')}</a>
                        )}
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)}
                                title={rwckT('rwck33')}
                                onClick={()=>this._removeProject(p.id)}>
                            <Trash2 size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    async _removeProject (id) {
        if (!window.confirm(rwckT('rwck81').replace('{id}', id))) return;
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
                    <input style={S.input} placeholder={rwckT('rwck62')} value={this.state.worksQ}
                           onChange={e=>this.setState({worksQ: e.target.value})} />
                    <select style={{...S.input, flex:'0 0 130px'}} value={this.state.worksCategory}
                            onChange={e=>this.setState({worksCategory: e.target.value})}>
                        <option value=''>{rwckT('rwck149')}</option>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.zh}</option>)}
                    </select>
                    <select style={{...S.input, flex:'0 0 110px'}} value={this.state.worksSort}
                            onChange={e=>this.setState({worksSort: e.target.value})}>
                        <option value='new'>{rwckT('rwck208')}</option>
                        <option value='score'>{rwckT('rwck210')}</option>
                    </select>
                    <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._loadWorks()}>
                        <Search size={14} strokeWidth={2.2} /> {rwckT('rwck60')}
                    </button>
                </div>
                {errBar(S, this.state.worksErr)}
                {this.state.worksBusy && <div style={S.ok}>{rwckT('rwck164')}</div>}
                {!this.state.worksBusy && this.state.worksList.length === 0 && (
                    <div style={S.hint}>{rwckT('rwck221')}</div>
                )}
                {this.state.worksList.map((p, i) => (
                    <div key={p.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>
                            <span style={{fontWeight:600}}>{p.title}</span>
                            <span style={{color: C.textSubtle, fontSize:11, marginLeft:6}}>
                                {p.category} · {p.author && (p.author.nickname || p.author.username) || rwckT('rwck35')}
                            </span>
                        </span>
                        <span style={{fontSize:11, color: C.textSubtle}}>
                            <Heart size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} /> {p.likeCount || 0}
                            · <Eye size={12} strokeWidth={2.2} style={{verticalAlign:'-2px'}} /> {p.views || 0}
                        </span>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck77')}
                                onClick={()=>this._likeProject(p.id)}>
                            <ThumbsUp size={13} strokeWidth={2.2} />
                        </button>
                        {p.shortLinkSlug && (
                            <a href={`https://forum.ctspace.xyz/g/${p.shortLinkSlug}`} target='_blank' rel='noreferrer'
                               style={{...S.link, fontSize:11}}>{rwckT('rwck255')}</a>
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
            this.setState({extErr: rwckT('rwck416')});
            return;
        }
        this.setState({extBusy: true, extErr: '', extOk: ''});
        try {
            await rwck.extensions.create({
                title: extTitle, summary: extSummary, category: extCategory,
                code: extCode, license: 'mit'
            });
            this.setState({extBusy: false, extOk: rwckT('rwck56'), extTitle: '', extSummary: '', extCode: ''});
            this._loadExtMine();
        } catch (e) {
            this.setState({extErr: this._friendlyError(e), extBusy: false});
        }
    }

    async _removeExt (id) {
        if (!window.confirm(rwckT('rwck82').replace('{id}', id))) return;
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
                    <div style={S.sectionTitle}>{rwckT('rwck168')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck214')}</label>
                        <input style={S.input} value={this.state.extTitle}
                               onChange={e=>this.setState({extTitle: e.target.value})} />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck244')}</label>
                        <input style={S.input} value={this.state.extSummary}
                               onChange={e=>this.setState({extSummary: e.target.value})} />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck157')}</label>
                        <select style={S.input} value={this.state.extCategory}
                                onChange={e=>this.setState({extCategory: e.target.value})}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.zh}</option>)}
                        </select>
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck226')}</label>
                        <textarea style={S.textarea} value={this.state.extCode}
                                  onChange={e=>this.setState({extCode: e.target.value})}
                                  placeholder={rwckT('rwck4')} />
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={cls(S.btn, S.btnPrimary, this.state.extBusy && S.btnDisabled)}
                                disabled={this.state.extBusy}
                                onClick={()=>this._createExt()}>
                            <Plus size={14} strokeWidth={2.2} /> {rwckT('rwck168')}
                        </button>
                    </div>
                </div>
                {errBar(S, this.state.extErr)}
                {okBar(S, this.state.extOk)}

                <div style={S.sectionTitle}>{rwckT('rwck151')}</div>
                <div style={S.row}>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadExt()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                </div>
                {this.state.extList.map((x, i) => (
                    <div key={x.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>
                            <span style={{fontWeight:600}}>{x.title}</span>
                            <span style={{color: C.textSubtle, fontSize:11, marginLeft:6}}>{x.category}</span>
                        </span>
                        <a href={rwck.extensions.rawUrl(x.id)} target='_blank' rel='noreferrer'
                           style={{...S.link, fontSize:11}}>{rwckT('rwck225')}</a>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck76')}
                                onClick={()=>this._likeExt(x.id)}>
                            <ThumbsUp size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}

                {this.state.extMine.length > 0 && (
                    <React.Fragment>
                        <div style={S.sectionTitle}>{rwckT('rwck191')}</div>
                        {this.state.extMine.map((x, i) => (
                            <div key={x.id || i} style={S.listItem}>
                                <span style={{flex:1, fontWeight:600}}>{x.title}</span>
                                <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck32')}
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
            this.setState({driveOk: rwckT('rwck123'), driveBusy: false});
            this._loadDrive();
        } catch (err) {
            this.setState({driveErr: this._friendlyError(err), driveBusy: false});
        }
    }

    async _removeDriveFile (id) {
        if (!window.confirm(rwckT('rwck83'))) return;
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
                        <Upload size={14} strokeWidth={2.2} /> {rwckT('rwck139')}
                        <input type='file' style={{display:'none'}} onChange={e=>this._uploadDrive(e)} />
                    </label>
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadDrive()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                    {this.state.driveUsage && (
                        <span style={S.fileInfo}>
                            {rwckT('rwck417').replace('{n}', this.state.driveUsage.used ?? this.state.driveUsage.usedBytes ?? '?')}
                            {this.state.driveUsage.total ?? this.state.driveUsage.totalBytes ?? '?'}
                        </span>
                    )}
                </div>
                {errBar(S, this.state.driveErr)}
                {okBar(S, this.state.driveOk)}
                {this.state.driveBusy && <div style={S.ok}>{rwckT('rwck182')}</div>}
                {this.state.driveFiles.map((f, i) => (
                    <div key={f.id || i} style={S.listItem}>
                        <FileText size={14} strokeWidth={2.2} style={{color: C.textSubtle}} />
                        <span style={{flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {f.name || f.filename}
                        </span>
                        {f.shareId && (
                            <a href={rwck.drive.rawUrl(f.shareId)} target='_blank' rel='noreferrer'
                               style={{...S.link, fontSize:11}}>{rwckT('rwck240')}</a>
                        )}
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck32')}
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
            this.setState({resOk: rwckT('rwck124'), resBusy: false});
        } catch (err) {
            this.setState({resErr: this._friendlyError(err), resBusy: false});
        }
    }

    async _addNetdisk () {
        const {netdiskLink, netdiskCode} = this.state;
        if (!netdiskLink.trim()) {
            this.setState({resErr: rwckT('rwck106')});
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
            this.setState({resOk: rwckT('rwck88'), resBusy: false, netdiskLink: '', netdiskCode: ''});
        } catch (e) {
            this.setState({resErr: this._friendlyError(e), resBusy: false});
        }
    }

    _renderResources (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck140')}</div>
                    <div style={S.row}>
                        <label style={cls(S.btn, S.btnGhost)}>
                            <Upload size={14} strokeWidth={2.2} /> {rwckT('rwck257')}
                            <input type='file' style={{display:'none'}} onChange={e=>this._uploadResource(e)} />
                        </label>
                        <span style={S.fileInfo}>{rwckT('rwck418')}</span>
                    </div>
                </div>
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck237')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck258')}</label>
                        <input style={S.input} value={this.state.netdiskLink}
                               onChange={e=>this.setState({netdiskLink: e.target.value})}
                               placeholder='https://pan.xxx.com/s/…' />
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck199')}</label>
                        <input style={S.input} value={this.state.netdiskCode}
                               onChange={e=>this.setState({netdiskCode: e.target.value})} />
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._addNetdisk()}>
                            <Plus size={14} strokeWidth={2.2} /> {rwckT('rwck235')}
                        </button>
                    </div>
                </div>
                {errBar(S, this.state.resErr)}
                {okBar(S, this.state.resOk)}
                <div style={S.sectionTitle}>{rwckT('rwck186')}</div>
                {this.state.resList.map((r, i) => (
                    <div key={r.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>{r.name || r.filename || rwckT('rwck132')}</span>
                        <a href={`https://forum.ctspace.xyz/r/${r.id}`} target='_blank' rel='noreferrer'
                           style={{...S.link, fontSize:11}}>{rwckT('rwck196')}</a>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 互动（评论 / 点赞 / 表态 / 收藏 / 关注） ==========
    async _loadComments () {
        const {commentTargetType, commentTargetId} = this.state;
        if (!commentTargetId) {
            this.setState({socialErr: rwckT('rwck419')});
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
            this.setState({socialErr: rwckT('rwck80')});
            return;
        }
        this.setState({socialBusy: true, socialErr: '', socialOk: ''});
        try {
            await rwck.comments.create({targetType: commentTargetType, targetId: commentTargetId, content: commentText});
            this.setState({commentText: '', socialOk: rwckT('rwck97'), socialBusy: false});
            this._loadComments();
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    async _toggleLike () {
        const {likeTargetType, likeTargetId} = this.state;
        if (!likeTargetId) {
            this.setState({socialErr: rwckT('rwck104')});
            return;
        }
        try {
            await rwck.likes.toggle({targetType: likeTargetType, targetId: likeTargetId});
            this.setState({socialOk: rwckT('rwck420')});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _toggleBookmark () {
        const {bookmarkTargetType, bookmarkTargetId} = this.state;
        if (!bookmarkTargetId) {
            this.setState({socialErr: rwckT('rwck102')});
            return;
        }
        try {
            await rwck.bookmarks.add({targetType: bookmarkTargetType, targetId: bookmarkTargetId});
            this.setState({socialOk: rwckT('rwck48')});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _checkBookmark () {
        const {bookmarkTargetType, bookmarkTargetId} = this.state;
        try {
            const r = await rwck.bookmarks.check(bookmarkTargetType, bookmarkTargetId);
            this.setState({socialOk: rwckT('rwck129')});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _sendReaction () {
        const {likeTargetType, likeTargetId} = this.state;
        try {
            await rwck.reactions.add({targetType: likeTargetType, targetId: likeTargetId, reaction: 'like'});
            this.setState({socialOk: rwckT('rwck93')});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e)});
        }
    }

    async _followByUsername () {
        const name = this.state.followUsername.trim();
        if (!name) {
            this.setState({socialErr: rwckT('rwck110')});
            return;
        }
        this.setState({socialBusy: true, socialErr: '', socialOk: ''});
        try {
            const u = await rwck.users.byUsername(name);
            await rwck.users.toggleFollow(u.id);
            this.setState({socialOk: rwckT('rwck126').replace('{name}', name), socialBusy: false});
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
                this.setState({socialErr: rwckT('rwck86'), socialBusy: false});
                return;
            }
            await rwck.followTags.add(first.id);
            this.setState({socialOk: rwckT('rwck125'), socialBusy: false});
        } catch (e) {
            this.setState({socialErr: this._friendlyError(e), socialBusy: false});
        }
    }

    _renderSocial (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck259')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck239')}</label>
                        <select style={S.input} value={this.state.commentTargetType}
                                onChange={e=>this.setState({commentTargetType: e.target.value})}>
                            <option value='project'>{rwckT('rwck144')}</option>
                            <option value='discussion'>{rwckT('rwck247')}</option>
                            <option value='extension'>{rwckT('rwck197')}</option>
                        </select>
                    </div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck238')}</label>
                        <input style={S.input} value={this.state.commentTargetId}
                               onChange={e=>this.setState({commentTargetId: e.target.value})} />
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadComments()}>
                            <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck163')}
                        </button>
                    </div>
                    <div style={S.row}>
                        <textarea style={S.textarea} value={this.state.commentText}
                                  onChange={e=>this.setState({commentText: e.target.value})}
                                  placeholder={rwckT('rwck27')} />
                    </div>
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._postComment()}>
                            <Send size={14} strokeWidth={2.2} /> {rwckT('rwck170')}
                        </button>
                    </div>
                    {this.state.commentsList.map((c, i) => (
                        <div key={c.id || i} style={{...S.listItem, alignItems:'flex-start'}}>
                            <span style={{flex:1}}>
                                <b style={{fontSize:12}}>{c.author && (c.author.nickname || c.author.username) || rwckT('rwck35')}</b>
                                <div style={{fontSize:12, color: C.text}}>{c.content}</div>
                            </span>
                            <span style={{fontSize:11, color: C.textSubtle}}>{this._fmtTime(c.createdAt)}</span>
                        </div>
                    ))}
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck228')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck239')}</label>
                        <select style={S.input} value={this.state.likeTargetType}
                                onChange={e=>this.setState({likeTargetType: e.target.value})}>
                            <option value='project'>{rwckT('rwck144')}</option>
                            <option value='discussion'>{rwckT('rwck247')}</option>
                            <option value='post'>{rwckT('rwck187')}</option>
                            <option value='extension'>{rwckT('rwck197')}</option>
                        </select>
                        <label style={S.label}>{rwckT('rwck238')}</label>
                        <input style={S.input} value={this.state.likeTargetId}
                               onChange={e=>this.setState({
                                   likeTargetId: e.target.value,
                                   bookmarkTargetId: e.target.value,
                                   bookmarkTargetType: this.state.likeTargetType
                               })} />
                    </div>
                    <div style={{...S.row, marginTop:6, flexWrap:'wrap'}}>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._toggleLike()}>
                            <ThumbsUp size={14} strokeWidth={2.2} /> {rwckT('rwck227')}
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._sendReaction()}>
                            <Smile size={14} strokeWidth={2.2} /> {rwckT('rwck246')}
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._toggleBookmark()}>
                            <Bookmark size={14} strokeWidth={2.2} /> {rwckT('rwck201')}
                        </button>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._checkBookmark()}>
                            <Search size={14} strokeWidth={2.2} /> {rwckT('rwck211')}
                        </button>
                    </div>
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck152')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck231')}</label>
                        <input style={S.input} value={this.state.followUsername}
                               onChange={e=>this.setState({followUsername: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._followByUsername()}>
                            <UserPlus size={14} strokeWidth={2.2} /> {rwckT('rwck153')}
                        </button>
                    </div>
                    <div style={{...S.row, marginTop:6}}>
                        <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._followFirstTag()}>
                            <Hash size={14} strokeWidth={2.2} /> {rwckT('rwck154')}
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
            this.setState({checkin: s, checkinErr: ''});
        } catch (e) {
            this.setState({checkinErr: this._friendlyError(e)});
        }
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
                        <strong style={{fontSize:13}}>{rwckT('rwck220')}</strong>
                        <span style={{flex:1}} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._doCheckin()}>
                            <Star size={14} strokeWidth={2.2} /> {rwckT('rwck243')}
                        </button>
                    </div>
                    {this.state.checkin ? (
                        <div style={S.hint}>
                            {rwckT('rwck421').replace('{n}', this.state.checkin.streak ?? this.state.checkin.days ?? 0)}
                            {this.state.checkin.checkedToday ? rwckT('rwck422') : ''}
                        </div>
                    ) : (
                        <div style={S.hint}>{this.state.checkinErr || rwckT('rwck205')}</div>
                    )}
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>{rwckT('rwck260')}</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadNotify()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                    <button style={cls(S.btn, S.btnGhost)}
                            onClick={async ()=>{
                                try { await rwck.notifications.markAllRead(); this._loadNotify(); }
                                catch (e) { this.setState({notifyErr: this._friendlyError(e)}); }
                            }}>
                        <CheckCircle size={14} strokeWidth={2.2} /> {rwckT('rwck150')}
                    </button>
                </div>
                {errBar(S, this.state.notifyErr)}
                {this.state.notifyBusy && <div style={S.ok}>{rwckT('rwck164')}</div>}
                {!this.state.notifyBusy && !this.state.notifyErr && this.state.notifyList.length === 0 && (
                    <div style={S.hint}>{rwckT('rwck205')}</div>
                )}
                {this.state.notifyList.map((n, i) => (
                    <div key={n.id || i} style={S.listItem}>
                        <Bell size={13} strokeWidth={2.2} style={{color: n.read ? C.textSubtle : C.accent}} />
                        <span style={{flex:1, minWidth:0}}>{n.content || n.title || n.type}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{this._fmtTime(n.createdAt)}</span>
                        {!n.read && (
                            <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck70')}
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
            this.setState({searchErr: rwckT('rwck107')});
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
                    <input style={S.input} placeholder={rwckT('rwck61')} value={this.state.searchQ}
                           onChange={e=>this.setState({searchQ: e.target.value})} />
                    <select style={{...S.input, flex:'0 0 120px'}} value={this.state.searchType}
                            onChange={e=>this.setState({searchType: e.target.value})}>
                        <option value='all'>{rwckT('rwck148')}</option>
                        <option value='project'>{rwckT('rwck144')}</option>
                        <option value='discussion'>{rwckT('rwck247')}</option>
                        <option value='user'>{rwckT('rwck230')}</option>
                        <option value='extension'>{rwckT('rwck197')}</option>
                    </select>
                    <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._doSearch()}>
                        <Search size={14} strokeWidth={2.2} /> {rwckT('rwck60')}
                    </button>
                </div>
                {errBar(S, this.state.searchErr)}
                {this.state.searchBusy && <div style={S.ok}>{rwckT('rwck200')}</div>}
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
            this.setState({origErr: rwckT('rwck111')});
            return;
        }
        this.setState({origBusy: true, origErr: '', origOk: ''});
        try {
            const r = await rwck.origmark.verify(cert);
            this.setState({origVerify: r, origOk: rwckT('rwck131').replace('{cert}', cert), origBusy: false});
        } catch (e) {
            this.setState({origErr: this._friendlyError(e), origBusy: false});
        }
    }

    _renderOrig (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck216')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck236')}</label>
                        <input style={S.input} value={this.state.origCert}
                               onChange={e=>this.setState({origCert: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._verifyOrig()}>
                            <ShieldCheck size={14} strokeWidth={2.2} /> {rwckT('rwck215')}
                        </button>
                    </div>
                    {this.state.origVerify && (
                        <pre style={{...S.hint, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all'}}>
                            {JSON.stringify(this.state.origVerify, null, 2)}
                        </pre>
                    )}
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>{rwckT('rwck193')}</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadOrig()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                </div>
                {errBar(S, this.state.origErr)}
                {okBar(S, this.state.origOk)}
                {this.state.origList.map((g, i) => (
                    <div key={g.id || i} style={S.listItem}>
                        <span style={{flex:1, minWidth:0}}>{g.title || g.certNumber || rwckT('rwck130')}</span>
                        <span style={{fontSize:11, color: C.textSubtle}}>{g.status || ''}</span>
                    </div>
                ))}
            </div>
        );
    }

    // ========== 云变量 ==========
    async _loadCloud () {
        if (!rwck.authState().token) {
            this.setState({cloudErr: rwckT('rwck423')});
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
            this.setState({cloudErr: rwckT('rwck112')});
            return;
        }
        try {
            await rwck.cloud.create(name);
            this.setState({cloudName: '', cloudOk: rwckT('rwck13')});
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
            this.setState({cloudErr: rwckT('rwck100')});
            return;
        }
        try {
            await rwck.cloud.setVariable(cloudSel, {name: cloudVarName, value: cloudVarValue, scope: 'global'});
            this.setState({cloudOk: rwckT('rwck127')});
            this._loadCloudVars(cloudSel);
        } catch (e) {
            this.setState({cloudErr: this._friendlyError(e)});
        }
    }

    _renderCloud (S, C) {
        return (
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck204')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck261')}</label>
                        <input style={S.input} value={this.state.cloudName}
                               onChange={e=>this.setState({cloudName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createCloud()}>
                            <Plus size={14} strokeWidth={2.2} /> {rwckT('rwck161')}
                        </button>
                    </div>
                </div>
                <div style={S.row}>
                    <strong style={{fontSize:13}}>{rwckT('rwck192')}</strong>
                    <span style={{flex:1}} />
                    <button style={cls(S.btn, S.btnGhost)} onClick={()=>this._loadCloud()}>
                        <RefreshCw size={14} strokeWidth={2.2} /> {rwckT('rwck162')}
                    </button>
                </div>
                {errBar(S, this.state.cloudErr)}
                {okBar(S, this.state.cloudOk)}
                {this.state.cloudProjects.map((p, i) => (
                    <div key={p.id || i} style={S.listItem}>
                        <Database size={13} strokeWidth={2.2} style={{color: C.textSubtle}} />
                        <span style={{flex:1, minWidth:0}}>{p.name}</span>
                        <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck68')}
                                onClick={()=>this._loadCloudVars(p.id)}>
                            <Eye size={13} strokeWidth={2.2} />
                        </button>
                    </div>
                ))}
                {this.state.cloudSel && (
                    <div style={S.box}>
                        <div style={S.sectionTitle}>{rwckT('rwck262')}</div>
                        <div style={S.row}>
                            <label style={S.label}>{rwckT('rwck173')}</label>
                            <input style={S.input} value={this.state.cloudVarName}
                                   onChange={e=>this.setState({cloudVarName: e.target.value})} />
                        </div>
                        <div style={S.row}>
                            <label style={S.label}>{rwckT('rwck146')}</label>
                            <input style={S.input} value={this.state.cloudVarValue}
                                   onChange={e=>this.setState({cloudVarValue: e.target.value})} />
                        </div>
                        <div style={{...S.row, marginTop:6}}>
                            <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._setCloudVar()}>
                                <Zap size={14} strokeWidth={2.2} /> {rwckT('rwck156')}
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
            this.setState({devErr: rwckT('rwck423')});
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
            this.setState({devErr: rwckT('rwck108')});
            return;
        }
        try {
            await rwck.apiKeys.create({name});
            this.setState({newKeyName: '', devOk: rwckT('rwck44')});
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
            this.setState({devErr: rwckT('rwck109')});
            return;
        }
        try {
            await rwck.tags.create({name});
            this.setState({newTagName: '', devOk: rwckT('rwck69')});
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
                    <div style={S.sectionTitle}>{rwckT('rwck134')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck175')}</label>
                        <input style={S.input} value={this.state.newKeyName}
                               onChange={e=>this.setState({newKeyName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createKey()}>
                            <Key size={14} strokeWidth={2.2} /> {rwckT('rwck203')}
                        </button>
                    </div>
                    {this.state.devKeys.map((k, i) => (
                        <div key={k.id || i} style={S.listItem}>
                            <Key size={13} strokeWidth={2.2} style={{color: C.textSubtle}} />
                            <span style={{flex:1, minWidth:0}}>{k.name}</span>
                            <button style={cls(S.btn, S.btnGhost, S.btnIcon)} title={rwckT('rwck32')}
                                    onClick={()=>this._removeKey(k.id)}>
                                <Trash2 size={13} strokeWidth={2.2} />
                            </button>
                        </div>
                    ))}
                </div>

                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck241')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck213')}</label>
                        <input style={S.input} value={this.state.newTagName}
                               onChange={e=>this.setState({newTagName: e.target.value})} />
                        <button style={cls(S.btn, S.btnPrimary)} onClick={()=>this._createTag()}>
                            <Tag size={14} strokeWidth={2.2} /> {rwckT('rwck203')}
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

                <div style={S.sectionTitle}>{rwckT('rwck172')}</div>
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
            proxyInput: saved || (props && props.getApiClient && props.getApiClient().getCorsAnywhere())
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
            body.innerHTML = `<div style="color:#7a8290;padding:12px">${rwckT('rwck207')}</div>`;
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
                (e.error ? `<div style="color:#ff9a9a">${rwckT('rwck424').replace('{msg}', e.error)}</div>` : '') +
                '</div>';
            body.appendChild(row);
        });
        body.scrollTop = body.scrollHeight;
    }

    _asyncApply () {
        const v = (this.state.proxyInput || '').trim().replace(/\/$/, '');
        if (!v) return this.setState({applyMsg: rwckT('rwck17')});
        if (!/^https?:\/\//.test(v)) return this.setState({applyMsg: rwckT('rwck18')});
        this.setState({applyBusy: true, applyMsg: rwckT('rwck425')});
        try {
            localStorage.setItem('rwck:cors-anywhere', v);
            if (typeof window !== 'undefined') window.__RWCK_CORS_ANYWHERE__ = v;
            setTimeout(() => this.setState({applyBusy: false,
                applyMsg: rwckT('rwck426')}), 250);
        } catch (e) {
            this.setState({applyBusy: false, applyMsg: rwckT('rwck23') + (e.message || e)});
        }
    }

    _restoreDefault () {
        if (!window.confirm(rwckT('rwck53'))) return;
        localStorage.removeItem('rwck:cors-anywhere');
        if (typeof window !== 'undefined') window.__RWCK_CORS_ANYWHERE__ = undefined;
        this.setState({proxyInput: 'https://cors-api.rewp.de5.net', applyMsg: rwckT('rwck47')});
    }

    async _copyLog () {
        const logs = (this._getNetLog && this._getNetLog()) || [];
        const text = logs.map(e => {
            let s = `[${new Date(e.t).toLocaleTimeString()}] ${e.dir} ${e.method || 'GET'} ${e.url}`;
            if (e.status) s += ` [${e.status}]`;
            if (e.error) s += ` ⚠ ${e.error}`;
            return s;
        }).join('\n');
        try { await navigator.clipboard.writeText(text); this.setState({applyMsg: rwckT('rwck65')}); }
        catch (_) { this.setState({applyMsg: rwckT('rwck43')}); }
    }
    _clearLog () {
        if (this._clearNetLog) { this._clearNetLog(); this._logRender(); this.setState({applyMsg: rwckT('rwck66')}); }
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
                        <b>{rwckT('rwck136')}</b> {rwckT('rwck158')}
                        <code style={{background:'#fef3c7', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>
                            Access-Control-Allow-Origin
                        </code>
                        {rwckT('rwck427')}
                        {rwckT('rwck428')}
                        {rwckT('rwck429')}
                    </div>
                </div>

                {/* 设置：CORS 代理前缀 */}
                <div style={S.box}>
                    <div style={S.sectionTitle}>{rwckT('rwck135')}</div>
                    <div style={S.row}>
                        <label style={S.label}>{rwckT('rwck142')}</label>
                        <input style={S.input} value={this.state.proxyInput}
                               onChange={e => this.setState({proxyInput: e.target.value})}
                               placeholder='https://cors-api.rewp.de5.net' />
                    </div>
                    <div style={S.hint}>
                        {rwckT('rwck188')} <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>https://cors-api.rewp.de5.net</code>
                        {rwckT('rwck254')} <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>?url=https://forum.ctspace.xyz/api/xxx</code>{rwckT('rwck138')}
                        <code style={{background:'#f1f5f9', padding:'0 4px', borderRadius:3, fontFamily:'monospace'}}>
                            {(this.props.getApiClient && this.props.getApiClient().getCorsAnywhere())
                                || 'https://cors-api.rewp.de5.net'}
                        </code>
                        {rwckT('rwck430')}
                    </div>
                    <div style={{...S.row, marginTop:8}}>
                        <button style={{...S.btn, ...S.btnPrimary, ...(this.state.applyBusy && S.btnDisabled)}}
                                disabled={this.state.applyBusy}
                                onClick={() => this._asyncApply()}>
                            <CheckCircle size={13} strokeWidth={2.2} /> {this.state.applyBusy ? rwckT('rwck431') : rwckT('rwck84')}
                        </button>
                        <button style={{...S.btn, ...S.btnGhost}} onClick={() => this._restoreDefault()}>
                            <Trash2 size={13} strokeWidth={2.2} /> {rwckT('rwck189')}
                        </button>
                    </div>
                    {this.state.applyMsg && <div style={S.msg}>{this.state.applyMsg}</div>}
                </div>

                {/* 网络日志大窗口 */}
                <div style={S.logBox}>
                    <div style={S.logHeader}>
                        <span style={{fontWeight:700, color:'#e6e6e6'}}>{rwckT('rwck245')}</span>
                        <span style={{flex:1}} />
                        <button style={{...S.btn, ...S.btnGhost, fontSize:11, padding:'3px 10px'}}
                                onClick={() => this._copyLog()}>{rwckT('rwck183')}</button>
                        <button style={{...S.btn, ...S.btnGhost, fontSize:11, padding:'3px 10px'}}
                                onClick={() => this._clearLog()}>{rwckT('rwck224')}</button>
                    </div>
                    <div style={S.logBody} ref={this._bodyRef} />
                </div>
            </div>
        );
    }
}
