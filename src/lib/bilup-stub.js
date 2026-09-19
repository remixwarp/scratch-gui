// No-op module: Bilup rotur-sdk / accounts-sdk were removed from the app
// (account system is fully deleted). scratch-vm source still has a
// dynamic require('rotur-sdk') inside extensions/rotur/core.js — when
// someone invokes any rotur extension block it will get an empty module
// instead of crashing the build. The extensions themselves remain
// registered but Rotur / RoturAccount etc. become undefined → a runtime
// TypeError inside scratch-vm that is safe to swallow (extension blocks
// are gated behind opt-in).
