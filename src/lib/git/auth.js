// Shared HTTP Basic auth builder for git remote operations (push / pull / clone).
//
// The same rule used to be copy-pasted in three places (the git-modal push
// handler, the git-modal clone handler and the File-menu gitAuth) with subtle
// differences between them. Keeping it in one place guarantees the three entry
// points authenticate identically.
//
// Convention:
//   - author name set    -> {username: authorName, password: token}
//     (Gitea / GitLab / self-hosted over HTTP Basic auth)
//   - no author name     -> {username: 'x-access-token', password: token}
//     (GitHub PAT style; GitHub only validates the password, any non-empty
//      username works, 'x-access-token' is the classic placeholder)
//   - empty token        -> returns null, i.e. anonymous / unauthenticated.
//     Callers may simply pass null as onAuth; isomorphic-git then performs the
//     request without credentials.
const buildHttpAuth = ({token = '', username = ''} = {}) => {
    const tk = String(token || '').trim();
    if (!tk) return null;
    const user = String(username || '').trim();
    return () => (user ?
        {username: user, password: tk} :
        {username: 'x-access-token', password: tk});
};

export default buildHttpAuth;
