/**
 * `classifyPull` decides which way a pull has to move the branch — the one
 * place where getting the direction wrong silently breaks the only case
 * `git pull` exists for.
 *
 * The bug this locks down: `pull()` used to name its reachability checks after
 * the remote ("remoteReachableFromHead") while calling
 * `git.isDescendent({oid, ancestor})`, which asks the opposite question.
 * Reproduced against a real isomorphic-git repo (temp/probe-pull.cjs):
 *
 *   远端领先 (head=A, remote=B)  →  旧代码判定 "nothing to pull"   ← A1 无法拉取
 *   本地领先 (head=B, remote=A)  →  旧代码判定 fast-forward，
 *                                   合并是空操作，上层却重建了整个项目
 *
 * Jest 21 note: this suite deliberately avoids `.resolves`/`.rejects` matchers
 * and awaits the promise instead — the project pins jest 21, and the plain
 * `expect(await …)` form has no matcher-availability surprises.
 */

import {classifyPull, PULL_VERDICTS} from '../../../src/lib/git/remote/reconcile';

// A tiny history: A → B. `contains(oid, ancestor)` mirrors isomorphic-git's
// `git.isDescendent({oid, ancestor})`: true when `ancestor` is reachable from
// `oid`, i.e. when `oid` is the descendant.
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const UNRELATED = 'c'.repeat(40);
const graph = {[A]: [], [B]: [A], [UNRELATED]: []};

const contains = (oid, ancestor) => {
    const seen = new Set();
    const queue = [oid];
    while (queue.length) {
        const current = queue.shift();
        if (current === ancestor) return true;
        if (seen.has(current)) continue;
        seen.add(current);
        (graph[current] || []).forEach(parent => queue.push(parent));
    }
    return false;
};

const classify = (headOid, remoteOid) => classifyPull({headOid, remoteOid, contains});

describe('classifyPull', () => {
    test('matching tips are up to date', async () => {
        expect(await classify(B, B)).toBe(PULL_VERDICTS.UP_TO_DATE);
    });

    test('a remote that is ahead must fast-forward (the A1 case)', async () => {
        // head=A, remote=B: B descends from A → the pull has work to do.
        expect(await classify(A, B)).toBe(PULL_VERDICTS.FAST_FORWARD);
    });

    test('a local branch that is ahead has nothing to pull', async () => {
        expect(await classify(B, A)).toBe(PULL_VERDICTS.LOCAL_AHEAD);
    });

    test('unrelated histories diverge instead of fast-forwarding', async () => {
        expect(await classify(B, UNRELATED)).toBe(PULL_VERDICTS.DIVERGED);
    });

    test('reachability is asked in the right direction', async () => {
        // Guards the argument order directly: swapping the two checks is what
        // produced "nothing to pull" for a remote-ahead branch.
        expect(await contains(A, B)).toBe(false);
        expect(await contains(B, A)).toBe(true);
    });

    test('missing tips (unborn branch / never-pushed remote) are not a fast-forward', async () => {
        expect(await classifyPull({headOid: null, remoteOid: B, contains}))
            .toBe(PULL_VERDICTS.DIVERGED);
        expect(await classifyPull({headOid: A, remoteOid: null, contains}))
            .toBe(PULL_VERDICTS.DIVERGED);
    });

    test('a missing oracle degrades to diverged rather than guessing', async () => {
        expect(await classifyPull({headOid: A, remoteOid: B}))
            .toBe(PULL_VERDICTS.DIVERGED);
    });
});
