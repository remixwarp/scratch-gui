// Community features (e.g. Save to Bilup) are enabled by default.
// Set MW_COMMUNITY=false at build time to explicitly disable them.
const communityEnabled = process.env.MW_COMMUNITY !== 'false';

export default communityEnabled;