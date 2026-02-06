/* global window, sessionStorage, fetch */
(function () {
  "use strict";

  var DEFAULTS = {
    projectId: "v54tdkwf",
    dataset: "production",
    apiVersion: "2025-02-01",
    useCdn: true,
    postType: "entry",
    entryKinds: []
  };
  var CACHE_PREFIX = "sanity-query-cache:";
  var CACHE_TTL_MS = 3 * 60 * 1000;

  function getConfig() {
    return Object.assign({}, DEFAULTS, window.SANITY_CONFIG || {});
  }

  function isConfigured() {
    var config = getConfig();
    return Boolean(config.projectId && config.dataset && config.apiVersion);
  }

  function getQueryUrl(config, useCdnHost) {
    var host = useCdnHost ? "apicdn.sanity.io" : "api.sanity.io";
    return "https://" + config.projectId + "." + host + "/v" + config.apiVersion + "/data/query/" + config.dataset;
  }

  function getCacheKey(rawQuery) {
    var config = getConfig();
    return [
      CACHE_PREFIX,
      config.projectId,
      config.dataset,
      config.apiVersion,
      String(config.useCdn),
      rawQuery
    ].join("|");
  }

  function readCache(rawQuery) {
    if (!window.sessionStorage) {
      return null;
    }
    try {
      var cacheKey = getCacheKey(rawQuery);
      var cached = sessionStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }
      var parsed = JSON.parse(cached);
      if (!parsed || !parsed.time || !Object.prototype.hasOwnProperty.call(parsed, "result")) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      if ((Date.now() - parsed.time) > CACHE_TTL_MS) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      return parsed.result;
    } catch (error) {
      return null;
    }
  }

  function writeCache(rawQuery, result) {
    if (!window.sessionStorage) {
      return;
    }
    try {
      var cacheKey = getCacheKey(rawQuery);
      sessionStorage.setItem(cacheKey, JSON.stringify({
        time: Date.now(),
        result: result
      }));
    } catch (error) {
      // Ignore quota issues.
    }
  }

  async function fetchQuery(rawQuery, options) {
    var config = getConfig();
    var requestOptions = options || {};

    if (!isConfigured()) {
      throw new Error("Sanity is not configured. Set projectId, dataset and apiVersion in js/sanity-config.js.");
    }

    var allowCache = requestOptions.cache !== false;
    if (allowCache) {
      var fromCache = readCache(rawQuery);
      if (fromCache) {
        return fromCache;
      }
    }

    if (window.location && window.location.protocol === "file:") {
      throw new Error("No se puede consultar Sanity desde file://. Ejecuta el sitio con un servidor local (por ejemplo, localhost).");
    }

    var preferFresh = requestOptions.fresh === true;
    var urls = [];
    if (preferFresh) {
      urls.push(getQueryUrl(config, false));
      urls.push(getQueryUrl(config, true));
    } else if (config.useCdn) {
      urls.push(getQueryUrl(config, true));
      urls.push(getQueryUrl(config, false));
    } else {
      urls.push(getQueryUrl(config, false));
      urls.push(getQueryUrl(config, true));
    }

    var lastError = null;
    for (var i = 0; i < urls.length; i += 1) {
      var url = urls[i] + "?query=" + encodeURIComponent(rawQuery);
      try {
        var response = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          cache: preferFresh ? "no-store" : "default",
          signal: requestOptions.signal
        });

        if (!response.ok) {
          var errorDetails = "";
          try {
            var errorPayload = await response.json();
            if (errorPayload && errorPayload.error && errorPayload.error.description) {
              errorDetails = " " + errorPayload.error.description;
            }
          } catch (parseError) {
            // Keep generic message.
          }
          var statusMessage = "Sanity request failed with status " + response.status + ".";
          if (response.status === 401 || response.status === 403) {
            statusMessage += " Verifica permisos del dataset y CORS en manage.sanity.io.";
          }
          statusMessage += errorDetails;
          throw new Error(statusMessage);
        }

        var payload = await response.json();
        if (payload.error) {
          throw new Error(payload.error.description || "Invalid Sanity query.");
        }

        var result = payload.result || null;
        if (allowCache) {
          writeCache(rawQuery, result);
        }
        return result;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      "No se pudo conectar con Sanity (" +
      (lastError && lastError.message ? lastError.message : "error de red") +
      "). Revisa CORS para tu origen y que projectId/dataset sean correctos."
    );
  }

  function toImageUrl(assetSource, options) {
    var config = getConfig();
    var params = options || {};

    if (!assetSource) {
      return "";
    }

    var baseUrl = "";
    if (typeof assetSource === "string" && assetSource.indexOf("http") === 0) {
      baseUrl = assetSource;
    } else if (typeof assetSource === "string") {
      var refMatch = assetSource.match(/^image-([^-]+)-(\d+x\d+)-([a-z0-9]+)$/i);
      if (!refMatch || !config.projectId) {
        return "";
      }
      baseUrl = "https://cdn.sanity.io/images/" + config.projectId + "/" + config.dataset + "/" + refMatch[1] + "-" + refMatch[2] + "." + refMatch[3];
    } else {
      return "";
    }

    var queryParams = [];
    if (params.w) {
      queryParams.push("w=" + encodeURIComponent(String(params.w)));
    }
    if (params.h) {
      queryParams.push("h=" + encodeURIComponent(String(params.h)));
    }
    if (params.fit) {
      queryParams.push("fit=" + encodeURIComponent(String(params.fit)));
    }
    if (params.auto) {
      queryParams.push("auto=" + encodeURIComponent(String(params.auto)));
    }
    if (params.q) {
      queryParams.push("q=" + encodeURIComponent(String(params.q)));
    }

    return queryParams.length ? baseUrl + "?" + queryParams.join("&") : baseUrl;
  }

  function formatDate(value, locale) {
    if (!value) {
      return "";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat(locale || "es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sanitizeSlug(input) {
    return String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
  }

  window.SanityBridge = Object.freeze({
    getConfig: getConfig,
    isConfigured: isConfigured,
    fetchQuery: fetchQuery,
    toImageUrl: toImageUrl,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    sanitizeSlug: sanitizeSlug
  });
})();
