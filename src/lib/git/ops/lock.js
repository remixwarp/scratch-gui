// Serializes repository mutations.
//
// The repository is a single shared resource backed by one OPFS/IndexedDB
// filesystem, yet two independent surfaces can drive it (the git window and the
// File → Git menu). Before this lock they could interleave — a push started from
// the menu while the window was mid-commit produced corrupted ref updates.
//
// Tasks are queued rather than rejected: the UI already disables its buttons
// while busy, so a queued task is either a legitimate follow-up click or a
// programmatic caller, and both are happier being serialized than dropped.

export const createLock = ({onChange} = {}) => {
    // Resolved promise acting as the tail of the queue. Always settled (never
    // rejected) so one failure cannot poison every later task.
    let tail = Promise.resolve();
    let depth = 0;
    let running = null;

    const notify = () => {
        if (typeof onChange === 'function') {
            try {
                onChange({running, pending: depth});
            } catch (e) {
                console.error('git lock onChange failed', e);
            }
        }
    };

    const settle = () => {
        depth -= 1;
        running = null;
        notify();
    };

    // Runs `task` after every previously queued task has settled. Resolves or
    // rejects with the task's own outcome.
    const run = (name, task) => {
        if (typeof task !== 'function') {
            return Promise.reject(new TypeError('git lock: task must be a function'));
        }
        depth += 1;
        notify();
        const result = tail.then(() => {
            running = name || null;
            notify();
            return task();
        });
        // Detach the queue from this task's outcome in both directions.
        tail = result.then(
            value => {
                settle();
                return value;
            },
            error => {
                settle();
                throw error;
            }
        );
        // `tail` must never be rejected, otherwise the next `.then` would skip
        // straight to its rejection handler.
        tail = tail.then(() => null, () => null);
        return result;
    };

    const isBusy = () => running !== null;

    const pending = () => depth;

    const current = () => running;

    // Resolves once the queue has drained. Useful before tearing down state.
    const drain = () => tail;

    return {run, isBusy, pending, current, drain};
};

// Shared instance for the whole editor: every mutation goes through this one.
const gitLock = createLock();

export default gitLock;
