// How much a sheet's forms must shrink so two of them fit its page: 1 when the tallest already
// fits, otherwise the share that does, but never below minFit, so the text stays readable. Kept
// apart from the page script so a plain Node check can run it.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PrintFit = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function fitFactor(heights, available, minFit) {
    const tallest = Math.max(0, ...heights);
    if (tallest <= available || available <= 0) return 1;
    return Math.max(minFit, available / tallest);
  }

  return { fitFactor };
});
