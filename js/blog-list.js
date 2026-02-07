/* global document, window */
(function () {
  "use strict";

  var feed = document.getElementById("blog-feed");
  if (!feed) {
    return;
  }

  function escapeForGroq(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function sanitizeDocType(value) {
    var type = String(value || "").trim();
    if (!/^[A-Za-z0-9_-]+$/.test(type)) {
      return "";
    }
    return type;
  }

  function buildTypeFilter(postTypes) {
    var values = Array.isArray(postTypes) ? postTypes : [postTypes];
    var sanitized = values
      .map(sanitizeDocType)
      .filter(function (type, index, list) {
        return Boolean(type) && list.indexOf(type) === index;
      });
    if (!sanitized.length) {
      return "";
    }
    if (sanitized.length === 1) {
      return "_type == \"" + escapeForGroq(sanitized[0]) + "\"";
    }
    return "_type in [" + sanitized.map(function (type) {
      return "\"" + escapeForGroq(type) + "\"";
    }).join(", ") + "]";
  }

  function buildKindsFilter(kinds) {
    if (!Array.isArray(kinds) || kinds.length === 0) {
      return "";
    }
    var sanitized = kinds
      .map(function (kind) {
        return String(kind || "").trim().toLowerCase();
      })
      .filter(function (kind) {
        return /^[a-z0-9_-]+$/.test(kind);
      });
    if (!sanitized.length) {
      return "";
    }
    return " && kind in [" + sanitized.map(function (kind) {
      return "\"" + escapeForGroq(kind) + "\"";
    }).join(", ") + "]";
  }

  function buildListQuery(postTypes, kinds, publishedOnly) {
    var typeFilter = buildTypeFilter(postTypes);
    var kindsFilter = buildKindsFilter(kinds);
    var publishFilter = publishedOnly ? " && defined(publishedAt) && publishedAt <= now()" : "";
    var baseFilter = (typeFilter ? typeFilter + " && " : "") + "defined(title) && defined(slug.current)";
    return [
      "*[" + baseFilter + publishFilter + kindsFilter + "]",
      "| order(publishedAt desc, _updatedAt desc)[0...24]{",
      "  _id,",
      "  \"docType\": _type,",
      "  kind,",
      "  title,",
      "  \"slug\": slug.current,",
      "  \"excerpt\": coalesce(excerpt, seo.metaDescription, \"\"),",
      "  publishedAt,",
      "  readingTime,",
      "  \"coverAssetRef\": coverImage.asset->_ref,",
      "  \"coverUrl\": coverImage.asset->url,",
      "  \"coverAlt\": coalesce(coverImage.alt, title),",
      "  \"tags\": coalesce(tags[]->title, []),",
      "  \"authorNames\": coalesce(authors[]->name, [])",
      "}"
    ].join("\n");
  }

  function getKindLabel(kind) {
    var map = {
      bitacora: "Bitacora",
      nota: "Nota",
      lab: "Lab"
    };
    return map[kind] || "Entrada";
  }

  function getPrimaryTag(post) {
    if (Array.isArray(post.tags) && post.tags.length > 0 && post.tags[0]) {
      return post.tags[0];
    }
    return getKindLabel(post.kind);
  }

  function getAuthorText(post) {
    if (!Array.isArray(post.authorNames) || post.authorNames.length === 0) {
      return "Equipo EJEZ";
    }
    return post.authorNames.filter(Boolean).join(", ");
  }

  function clampText(value, maxLength) {
    var text = String(value || "").trim();
    if (!text) {
      return "Sin extracto disponible para este artículo.";
    }
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength).trimEnd() + "…";
  }

  function renderState(title, description, isError) {
    feed.innerHTML = [
      "<article class=\"blog-state-card" + (isError ? " is-error" : "") + "\">",
      "  <h2>" + window.SanityBridge.escapeHtml(title) + "</h2>",
      "  <p>" + window.SanityBridge.escapeHtml(description) + "</p>",
      "</article>"
    ].join("");
  }

  function getCardImage(post) {
    var source = post.coverAssetRef || post.coverUrl;
    var imageUrl = window.SanityBridge.toImageUrl(source, {
      w: 900,
      h: 620,
      fit: "crop",
      auto: "format",
      q: 82
    });
    if (!imageUrl) {
      return "<div class=\"blog-card-image-fallback\" aria-hidden=\"true\"></div>";
    }
    return "<img loading=\"lazy\" decoding=\"async\" src=\"" + window.SanityBridge.escapeHtml(imageUrl) + "\" alt=\"" + window.SanityBridge.escapeHtml(post.coverAlt || post.title || "Portada del artículo") + "\" width=\"900\" height=\"620\">";
  }

  function renderCards(posts) {
    feed.innerHTML = posts.map(function (post) {
      var slug = window.SanityBridge.sanitizeSlug(post.slug);
      var kind = window.SanityBridge.sanitizeSlug(post.kind || "");
      var docType = sanitizeDocType(post.docType || "");
      var articleUrl = "article.html?slug=" + encodeURIComponent(slug) +
        (kind ? "&kind=" + encodeURIComponent(kind) : "") +
        (docType ? "&type=" + encodeURIComponent(docType) : "");
      var dateText = window.SanityBridge.formatDate(post.publishedAt);
      var excerpt = clampText(post.excerpt, 170);
      var authorText = getAuthorText(post);
      var readTime = Number(post.readingTime) > 0 ? " · " + String(Math.round(post.readingTime)) + " min" : "";

      return [
        "<article class=\"blog-card\">",
        "  <a class=\"blog-card-media\" href=\"" + window.SanityBridge.escapeHtml(articleUrl) + "\" aria-label=\"Abrir artículo " + window.SanityBridge.escapeHtml(post.title || "sin título") + "\">",
        getCardImage(post),
        "  </a>",
        "  <div class=\"blog-card-content\">",
        "    <div class=\"blog-card-meta\">",
        "      <span class=\"blog-card-category\">" + window.SanityBridge.escapeHtml(getPrimaryTag(post)) + "</span>",
        "      <span class=\"blog-card-date\">" + window.SanityBridge.escapeHtml(dateText) + "</span>",
        "    </div>",
        "    <h2 class=\"blog-card-title\"><a href=\"" + window.SanityBridge.escapeHtml(articleUrl) + "\">" + window.SanityBridge.escapeHtml(post.title || "Artículo sin título") + "</a></h2>",
        "    <p class=\"blog-card-excerpt\">" + window.SanityBridge.escapeHtml(excerpt) + "</p>",
        "    <p class=\"blog-card-author\">Por " + window.SanityBridge.escapeHtml(authorText) + readTime + "</p>",
        "  </div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function summarizePublishState(posts) {
    var now = Date.now();
    var undated = 0;
    var future = 0;

    posts.forEach(function (post) {
      if (!post.publishedAt) {
        undated += 1;
        return;
      }
      var date = new Date(post.publishedAt);
      if (!Number.isNaN(date.getTime()) && date.getTime() > now) {
        future += 1;
      }
    });

    var details = [];
    if (undated > 0) {
      details.push(String(undated) + " sin `publishedAt`");
    }
    if (future > 0) {
      details.push(String(future) + " con fecha futura");
    }
    var sample = posts.slice(0, 3).map(function (post) {
      var title = post.title || "(sin título)";
      var when = post.publishedAt || "sin publishedAt";
      return "\"" + title + "\" -> " + when;
    }).join(" | ");

    return details.join(" y ") + (sample ? ". Muestra: " + sample : "");
  }

  async function init() {
    if (!window.SanityBridge || !window.SanityBridge.isConfigured()) {
      renderState(
        "Conexión pendiente",
        "Configura tu proyecto en js/sanity-config.js para mostrar automáticamente los artículos desde Sanity Studio.",
        false
      );
      return;
    }

    try {
      feed.setAttribute("aria-busy", "true");
      var postType = sanitizeDocType(window.SanityBridge.getConfig().postType);
      var entryKinds = window.SanityBridge.getConfig().entryKinds || [];
      var primaryTypes = postType ? [postType] : [];
      var fallbackTypes = [postType, "entry", "post", "article", "blogPost", "blog", "nota"]
        .map(sanitizeDocType)
        .filter(function (type, index, list) {
          return Boolean(type) && list.indexOf(type) === index;
        });

      var posts = await window.SanityBridge.fetchQuery(buildListQuery(primaryTypes, entryKinds, true), { cache: false, fresh: true });
      if (!Array.isArray(posts) || posts.length === 0) {
        posts = await window.SanityBridge.fetchQuery(buildListQuery(fallbackTypes, [], true), { cache: false, fresh: true });
      }
      feed.removeAttribute("aria-busy");

      if (!Array.isArray(posts) || posts.length === 0) {
        var allEntries = await window.SanityBridge.fetchQuery(buildListQuery(fallbackTypes, [], false), { cache: false, fresh: true });
        if (Array.isArray(allEntries) && allEntries.length > 0) {
          var publishSummary = summarizePublishState(allEntries);
          renderState(
            "Hay entradas, pero no públicas aún",
            "Encontré " + String(allEntries.length) + " entradas en Sanity. " +
              (publishSummary ? "Estado: " + publishSummary + ". " : "") +
              "Para que aparezcan aquí, asegurá `publishedAt` con fecha/hora pasada y documento publicado.",
            true
          );
          return;
        }

        renderState(
          "Sin artículos publicados",
          "No encontramos entradas publicadas. Revisá que el documento esté publicado (no solo guardado en draft) y que `postType` en js/sanity-config.js coincida con tu schema.",
          false
        );
        return;
      }

      var validPosts = posts.filter(function (post) {
        return Boolean(window.SanityBridge.sanitizeSlug(post.slug));
      });
      if (!validPosts.length) {
        renderState(
          "Sin slugs válidos",
          "Tus artículos necesitan `slug.current` para generar URLs públicas.",
          true
        );
        return;
      }

      renderCards(validPosts);
    } catch (error) {
      feed.removeAttribute("aria-busy");
      renderState(
        "No pudimos cargar el blog",
        "Revisá la configuración de Sanity o la conexión de red. " + (error && error.message ? error.message : ""),
        true
      );
    }
  }

  init();
})();
