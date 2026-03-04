export default async function ({ addon, console }) {
  console.log('daily-quote addon loaded');

  // No DOM injection required because DailyQuote is integrated into React UI.
  // This userscript keeps the addon visible in the addon list and can be
  // expanded later to add dynamic behavior when the addon is enabled/disabled.

  addon.self.addEventListener('disabled', () => {
    console.log('daily-quote addon disabled');
  });
}
