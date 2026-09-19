// Shell user state, kept in a leaf module that imports nothing else.
//
// 为什么不放在 browser-terminal.js 里：那个模块 import 了 just-bash（浏览器包
// 约 1.2MB）和 browser-git.js（isomorphic-git + lightning-fs + JSZip）。而
// rotur-session.jsx 是 gui.jsx 静态引入的容器，它只需要在登录态变化时同步一下
// 终端提示符里的用户名——改造前它从 browser-terminal.js 引入 setShellUser，
// 于是整条 just-bash / git 依赖链被拖进了初始包，每个用户启动时都要下载并解析
// 这几 MB 代码，哪怕从不打开 Fractch 终端。
//
// 放到这个叶子模块后，初始包只包含这十几行；browser-terminal.js 与
// fractch-terminal.jsx 仍然共享同一份状态，行为完全不变。
let shellUser = {local: null, rotur: null};

const setShellUser = patch => {
    shellUser = {...shellUser, ...patch};
};

// The rotur handle wins over whatever username the VM was given for the
// cloud/username block.
const currentUser = () => shellUser.rotur || shellUser.local || 'player';

export {
    setShellUser,
    currentUser
};
