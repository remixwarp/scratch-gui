// 运行时性能审计微基准（直接在 Node 跑你的 scratch-vm fork，不需要浏览器/渲染器）
// 目标：量化文档里提到的几个「未优化」热路径在你 fork 上的真实扩展成本。
//
// 用法（在 scratch-gui 目录下）：
//   node bench-audit.js
//
// 仅依赖 scratch-vm 的源码（已 link 到 node_modules），不加载任何 SB3、不触碰渲染器。

// ---- 浏览器全局桩，避免 Runtime 构造时引用 window/document 报错 ----
global.window = global.window || { addEventListener () {}, removeEventListener () {}, AudioContext: function () {} };
global.document = global.document || { addEventListener () {}, removeEventListener () {}, createElement () { return { getContext () { return {}; } }; } };

const path = require('path');
const vmDir = path.resolve(__dirname, 'node_modules/scratch-vm');
const Runtime = require(path.join(vmDir, 'src/engine/runtime'));
const Blocks = require(path.join(vmDir, 'src/engine/blocks'));

const fakeRenderer = new Proxy({}, { get: () => () => 0 });
const rt = new Runtime();
rt.renderer = fakeRenderer;
rt.storage = null;
// 关掉编译器，走解释器路径，干净隔离「分发/扫描」成本（编译路径另有线程复用问题，单独说明）
rt.compilerOptions.enabled = false;

// 注册我们用到的 hat 类型，否则 startHats 会提前返回
rt._hats['event_whenbroadcastreceived'] = { edgeActivated: false, restartExistingThreads: false };
rt._hats['event_whenflagclicked'] = { edgeActivated: false, restartExistingThreads: false };
rt._hats['edge_test_hat'] = { edgeActivated: true, restartExistingThreads: false };

// 构造 N 个「目标」，每个挂一个 broadcast 接收脚本 与 一个 edge hat 脚本
function buildTargets (n, withEdge) {
    const targets = [];
    for (let i = 0; i < n; i++) {
        const b = new Blocks(rt);
        const recvId = `recv_${i}`;
        b.createBlock({
            id: recvId,
            opcode: 'event_whenbroadcastreceived',
            next: null, parent: null, inputs: {},
            fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: 'MSG', id: null } },
            topLevel: true, x: 0, y: 0
        }, { skipSideEffects: true });
        if (withEdge) {
            const edgeId = `edge_${i}`;
            b.createBlock({
                id: edgeId,
                opcode: 'edge_test_hat',
                next: null, parent: null, inputs: {}, fields: {},
                topLevel: true, x: 0, y: 0
            }, { skipSideEffects: true });
        }
        targets.push({ blocks: b, id: `t${i}`, isOriginal: true, isStage: false, variables: {}, lists: {} });
    }
    return targets;
}

function timeit (fn, iters) {
    // 热身
    for (let i = 0; i < 3; i++) fn();
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iters; i++) fn();
    const t1 = process.hrtime.bigint();
    return Number(t1 - t0) / 1e6 / iters; // ms/次
}

function resetThreads () {
    rt.threads = [];
    rt.threadMap.clear();
}

const Ns = [100, 1000, 5000, 10000];

console.log('=== A. 广播分发成本（一次 broadcast，匹配全部接收脚本）===');
console.log('   测量 runtime.startHats 对 event_whenbroadcastreceived 的端到端分发耗时');
for (const N of Ns) {
    rt.executableTargets = buildTargets(N, false);
    resetThreads();
    const ms = timeit(() => {
        resetThreads();
        rt.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'MSG' });
    }, 50);
    console.log(`   目标数=${String(N).padStart(6)}  每次广播分发=${ms.toFixed(3)} ms  (启动线程数≈${N})`);
}

console.log('\n=== B. 每帧 edge-hat 扫描成本（_step 每帧对每种 edge hat 调 startHats）===');
console.log('   文档：未优化时每帧扫全部脚本。本 fork 已有 opcode 缓存，这里测实际扩展成本');
for (const N of Ns) {
    rt.executableTargets = buildTargets(N, true);
    resetThreads();
    const ms = timeit(() => {
        resetThreads();
        // 复刻 _step 的 edge-hat 扫描逻辑
        for (const hatType in rt._hats) {
            if (!Object.prototype.hasOwnProperty.call(rt._hats, hatType)) continue;
            const hat = rt._hats[hatType];
            if (hat.edgeActivated) rt.startHats(hatType);
        }
    }, 50);
    console.log(`   edge 脚本数=${String(N).padStart(6)}  每帧扫描=${ms.toFixed(3)} ms`);
}

console.log('\n=== C. 广播「名匹配」线性扫描占比（仅测字段比较循环）===');
console.log('   文档称优化点是：把「按名比对所有脚本」改为「按名缓存接收者」。');
console.log('   本 fork 已有 BlocksRuntimeCache 按 opcode 缓存，但同 opcode 内仍逐个比名。');
{
    const N = 10000;
    rt.executableTargets = buildTargets(N, false);
    const b0 = rt.executableTargets[0].blocks;
    // 触发一次 getScripts 以填充 opcode 缓存（与真实运行一致）
    resetThreads();
    rt.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'MSG' });
    resetThreads();
    // 直接测量 getScripts（含 opcode 缓存命中）+ 字段比较 的循环
    const t0 = process.hrtime.bigint();
    const ITER = 2000;
    for (let k = 0; k < ITER; k++) {
        // 复刻 startHats 内 matchFields 比较：拿到同 opcode 脚本后逐个比 BROADCAST_OPTION
        const cache = b0._cache.scripts['event_whenbroadcastreceived'];
        let matched = 0;
        for (let j = 0; j < cache.length; j++) {
            const hatFields = cache[j].fieldsOfInputs;
            if (hatFields.BROADCAST_OPTION.value === 'MSG') matched++;
        }
    }
    const t1 = process.hrtime.bigint();
    const ms = Number(t1 - t0) / 1e6 / ITER;
    console.log(`   ${N} 个同 opcode 脚本，每帧广播名匹配循环=${ms.toFixed(4)} ms  (匹配命中≈${N})`);
}

console.log('\n审计完成。结论见下方说明。');
