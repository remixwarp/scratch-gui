// Localize the raw English errors thrown deep inside lib/git (browser-git /
// isomorphic-git surfaces them as plain strings). Anything already localized
// or unrecognized is returned unchanged, so this is safe to apply to any error
// message before displaying it.

const KNOWN_PREFIXES = [
    [/^Repository not initialized/, '尚未初始化 Git 仓库'],
    [/^No staged changes to commit/, '没有已暂存的更改。请先在“更改”列表中勾选要提交的文件，或点击“全部暂存”。'],
    [/^No changes to commit/, '没有可提交的更改（工作区与上次提交一致）'],
    [/^Project snapshot not found/, '找不到项目快照'],
    [/^No branch to push/, '没有可推送的分支，请先检出一个分支'],
    [/^No branch checked out to pull into/, '没有检出的分支可用于拉取'],
    [/^No upstream branch/, '远端还没有这个分支（找不到上游）。请先 Push 一次以发布该分支，之后即可拉取。'],
    [/^Diverged branches/, '本地与远端已分叉：两边各有对方没有的新提交，无法直接快进拉取。请在“分支”页手动合并后重试。'],
    [/^Cannot create branch: HEAD is missing/, '无法创建分支：HEAD 不存在，请先初始化或检出一个提交'],
    [/^Cannot delete branch/, '无法删除分支'],
    [/^Failed to delete branch/, '删除分支失败'],
    [/^Failed to save project/, '保存项目失败'],
    [/^Failed to restore project/, '还原项目失败'],
    [/^Failed to clone/, '克隆失败'],
    [/^Failed to commit/, '提交失败'],
    [/^Failed to push/, '推送失败'],
    [/^Failed to pull/, '拉取失败'],
    [/^Failed to checkout branch/, '切换分支失败'],
    [/^Failed to checkout commit/, '检出该提交失败'],
    [/^Failed to create branch/, '创建分支失败'],
    [/^Invalid branch name/, '分支名称不合法'],
    [/^Failed to merge/, '合并失败'],
    [/^Failed to read snapshot at commit/, '读取该提交的项目快照失败'],
    [/^Failed to delete repo/, '删除仓库失败'],
    [/^Invalid workspace path/, '非法文件路径'],
    [/^Invalid git configuration file/, 'Git 配置文件格式不正确或已损坏'],
    [/^No merge in progress/, '当前没有进行中的合并'],
    [/^Commit message is required/, '提交信息不能为空'],
    [/^Cannot undo commit while detached/, '处于游离 HEAD 状态（未在任何分支上），无法撤销提交。请先检出一个分支。'],
    [/^No previous commit to undo to/, '没有可撤销的上一个提交。'],
    [/^Failed to undo commit/, '撤销提交失败'],
    [/^VM is required/, '需要先打开一个项目（未获取到编辑器实例）'],
    [/^VM not provided/, '需要先打开一个项目（未获取到编辑器实例）'],
    [/^Failed to initialize/, '初始化仓库失败']
];

// Errors that carry an actionable reason we should surface verbatim after the
// localized headline.
const DETAILED = [
    /^Failed to (clone|commit|push|pull|merge|checkout|restore|save project|read snapshot)/
];

// ---------------------------------------------------------------------------
// Typed errors
//
// The legacy layer communicates failures as plain English strings, which forces
// every caller to re-parse prose to decide what to do. `GitError` adds a stable
// `code` so the UI can branch on intent (e.g. DIVERGED → offer a merge flow)
// while `raw` keeps the original detail for diagnostics.
// ---------------------------------------------------------------------------

export const GIT_ERROR_CODES = Object.freeze({
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    NO_CHANGES: 'NO_CHANGES',
    SNAPSHOT_MISSING: 'SNAPSHOT_MISSING',
    NO_BRANCH: 'NO_BRANCH',
    NO_UPSTREAM: 'NO_UPSTREAM',
    DIVERGED: 'DIVERGED',
    NON_FAST_FORWARD: 'NON_FAST_FORWARD',
    AUTH: 'AUTH',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    NETWORK: 'NETWORK',
    INVALID_NAME: 'INVALID_NAME',
    NOT_FRACTCH: 'NOT_FRACTCH',
    DETACHED_HEAD: 'DETACHED_HEAD',
    NO_PREVIOUS_COMMIT: 'NO_PREVIOUS_COMMIT',
    ABORTED: 'ABORTED',
    UNKNOWN: 'UNKNOWN'
});

const CODE_PATTERNS = [
    [/^Repository not initialized/, GIT_ERROR_CODES.NOT_INITIALIZED],
    [/^No staged changes to commit/, GIT_ERROR_CODES.NO_CHANGES],
    [/^No changes to commit/, GIT_ERROR_CODES.NO_CHANGES],
    [/^Project snapshot not found/, GIT_ERROR_CODES.SNAPSHOT_MISSING],
    [/^No branch to push/, GIT_ERROR_CODES.NO_BRANCH],
    [/^No branch checked out to pull into/, GIT_ERROR_CODES.NO_BRANCH],
    [/^No upstream branch/, GIT_ERROR_CODES.NO_UPSTREAM],
    [/^Diverged branches/, GIT_ERROR_CODES.DIVERGED],
    [/^No previous commit/, GIT_ERROR_CODES.NO_PREVIOUS_COMMIT],
    [/^Cannot undo commit while detached/, GIT_ERROR_CODES.DETACHED_HEAD],
    [/^Invalid branch name/, GIT_ERROR_CODES.INVALID_NAME],
    [/^Invalid workspace path/, GIT_ERROR_CODES.INVALID_NAME],
    [/not a fractch project/i, GIT_ERROR_CODES.NOT_FRACTCH],
    [/detached/i, GIT_ERROR_CODES.DETACHED_HEAD]
];

// Transport-level failures are matched on loose substrings because
// isomorphic-git wraps server responses in prose.
const TRANSPORT_PATTERNS = [
    [/non-fast-forward|not a fast-forward|rejected/i, GIT_ERROR_CODES.NON_FAST_FORWARD],
    [/401|unauthorized|authentication/i, GIT_ERROR_CODES.AUTH],
    [/403|forbidden/i, GIT_ERROR_CODES.FORBIDDEN],
    [/404|not found/i, GIT_ERROR_CODES.NOT_FOUND],
    [/cors|failed to fetch|networkerror|network error/i, GIT_ERROR_CODES.NETWORK]
];

// Best-effort classification of a raw English git error into a stable code.
// Unrecognized text yields UNKNOWN — callers must still handle that case.
export const classifyGitError = raw => {
    if (typeof raw !== 'string' || raw.length === 0) {
        return GIT_ERROR_CODES.UNKNOWN;
    }
    for (const [pattern, code] of CODE_PATTERNS) {
        if (pattern.test(raw)) return code;
    }
    for (const [pattern, code] of TRANSPORT_PATTERNS) {
        if (pattern.test(raw)) return code;
    }
    return GIT_ERROR_CODES.UNKNOWN;
};

export class GitError extends Error {
    constructor (code, message, options = {}) {
        super(message);
        this.name = 'GitError';
        this.code = code || GIT_ERROR_CODES.UNKNOWN;
        // Original text before any localization, kept for diagnostics.
        this.raw = options.raw || message || '';
        this.hint = options.hint || '';
        if ('cause' in options) {
            this.cause = options.cause;
        }
    }
}

// Normalize anything thrown by the git layer into a GitError. Already-typed
// errors pass through untouched so codes survive re-wrapping.
export const toGitError = (err, fallbackCode = GIT_ERROR_CODES.UNKNOWN) => {
    if (err instanceof GitError) return err;
    const raw = err && err.message ? err.message : String(err);
    const code = classifyGitError(raw);
    return new GitError(
        code === GIT_ERROR_CODES.UNKNOWN ? fallbackCode : code,
        raw,
        {cause: err, raw}
    );
};

const translateGitError = (raw, fallback = raw) => {
    if (typeof raw !== 'string' || raw.length === 0) {
        return fallback;
    }
    for (const [pattern, zh] of KNOWN_PREFIXES) {
        if (pattern.test(raw)) {
            if (DETAILED.some(d => d.test(raw))) {
                const colon = raw.indexOf(':');
                const detail = colon >= 0 ? raw.slice(colon + 1).trim() : '';
                return detail ? `${zh}：${detail}` : zh;
            }
            return zh;
        }
    }
    // Common transport / server-side failures from isomorphic-git itself.
    if (/non-fast-forward|not a fast-forward|rejected/i.test(raw)) {
        return '推送/合并被拒绝：远端包含本地没有的新提交（non-fast-forward）。请先在 Remote 拉取远端分支，再处理分叉后重试。';
    }
    if (/401|unauthorized|authentication/i.test(raw)) {
        return '认证失败（401）。请检查 Settings 中的作者名与 Remote 中的访问令牌（Token）。';
    }
    if (/403|forbidden/i.test(raw)) {
        return '访问被拒绝（403）。令牌可能缺少仓库权限，或远端禁止该操作。';
    }
    if (/404|not found/i.test(raw)) {
        return '找不到目标（404）。请检查远端仓库地址是否正确、仓库是否公开或令牌是否有权访问。';
    }
    if (/cors|failed to fetch|networkerror|network error/i.test(raw)) {
        return '网络/CORS 错误：无法连接远端。当前通过 cors.isomorphic-git.org 转发请求，请检查网络与远端可达性。';
    }
    return fallback;
};

export default translateGitError;
