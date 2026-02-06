/* global window */
(function () {
  "use strict";

  // Replace with your Sanity project values.
  // Keep `useCdn: true` for max read performance in production.
  window.SANITY_CONFIG = Object.freeze({
    projectId: "v54tdkwf",
    dataset: "production",
    apiVersion: "2025-02-01",
    useCdn: true,
    postType: "entry",
    // Optional: set only if you want to restrict listing by kind.
    // Example: ["bitacora", "nota", "lab"]
    entryKinds: []
  });
})();
