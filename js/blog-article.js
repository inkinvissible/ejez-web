/* global document, window */
(function () {
  "use strict";

  var heroTitle = document.getElementById("article-title");
  var heroExcerpt = document.getElementById("article-excerpt");
  var heroMeta = document.getElementById("article-meta");
  var heroKicker = document.getElementById("article-kicker");
  var heroCover = document.getElementById("article-cover");
  var articleBody = document.getElementById("article-body");
  var breadcrumbCurrent = document.getElementById("breadcrumb-current");
  var articleContainer = document.getElementById("article-container");

  if (!articleBody || !heroTitle || !heroExcerpt || !heroMeta) {
    return;
  }

  function getSlugFromSearch() {
    var params = new URLSearchParams(window.location.search);
    return window.SanityBridge.sanitizeSlug(params.get("slug"));
  }

  function getKindFromSearch() {
    var params = new URLSearchParams(window.location.search);
    return window.SanityBridge.sanitizeSlug(params.get("kind"));
  }

  function sanitizeDocType(value) {
    var type = String(value || "").trim();
    if (!/^[A-Za-z0-9_-]+$/.test(type)) {
      return "";
    }
    return type;
  }

  function getTypeFromSearch() {
    var params = new URLSearchParams(window.location.search);
    return sanitizeDocType(params.get("type"));
  }

  function escapeForGroq(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function buildTypeFilter(types) {
    var list = Array.isArray(types) ? types : [types];
    var sanitized = list
      .map(sanitizeDocType)
      .filter(function (type, index, items) {
        return Boolean(type) && items.indexOf(type) === index;
      });
    if (!sanitized.length) {
      return "defined(_type)";
    }
    if (sanitized.length === 1) {
      return "_type == \"" + escapeForGroq(sanitized[0]) + "\"";
    }
    return "_type in [" + sanitized.map(function (type) {
      return "\"" + escapeForGroq(type) + "\"";
    }).join(", ") + "]";
  }

  function setMetaTag(selector, value) {
    var tag = document.querySelector(selector);
    if (!tag) {
      return;
    }
    tag.setAttribute("content", value);
  }

  function setCanonical(url) {
    var link = document.querySelector("link[rel='canonical']");
    if (!link) {
      return;
    }
    link.setAttribute("href", url);
  }

  function getKindLabel(kind) {
    var map = {
      bitacora: "Bitacora",
      nota: "Nota",
      lab: "Lab"
    };
    return map[window.SanityBridge.sanitizeSlug(kind || "")] || "Publicación";
  }

  function setMetaItems(items) {
    var list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) {
      heroMeta.textContent = "";
      return;
    }
    heroMeta.innerHTML = list.map(function (item) {
      return "<span class=\"article-meta-item\">" + window.SanityBridge.escapeHtml(item) + "</span>";
    }).join("");
  }

  function normalizeUrl(url) {
    var value = String(url || "").trim();
    if (!value) {
      return "";
    }
    if (value.charAt(0) === "/" || value.charAt(0) === "#") {
      return value;
    }
    if (/^(https?:|mailto:|tel:)/i.test(value)) {
      return value;
    }
    return "";
  }

  function markWrapper(mark, text, markDefs) {
    if (mark === "strong" || mark === "bold" || mark === "b") {
      return "<strong>" + text + "</strong>";
    }
    if (mark === "em") {
      return "<em>" + text + "</em>";
    }
    if (mark === "code") {
      return "<code>" + text + "</code>";
    }

    var def = markDefs[mark];
    if (def && def._type === "link") {
      var href = normalizeUrl(def.href);
      if (!href) {
        return text;
      }
      var isExternal = /^https?:/i.test(href);
      var attrs = [
        "href=\"" + window.SanityBridge.escapeHtml(href) + "\""
      ];
      if (isExternal) {
        attrs.push("target=\"_blank\"");
        attrs.push("rel=\"noopener noreferrer\"");
      }
      return "<a " + attrs.join(" ") + ">" + text + "</a>";
    }

    return text;
  }

  function renderSpans(block) {
    var defsArray = Array.isArray(block.markDefs) ? block.markDefs : [];
    var markDefs = defsArray.reduce(function (acc, item) {
      acc[item._key] = item;
      return acc;
    }, {});

    return (block.children || []).map(function (child) {
      if (!child || child._type !== "span") {
        return "";
      }
      var text = window.SanityBridge.escapeHtml(child.text || "").replace(/\n/g, "<br>");
      (child.marks || []).forEach(function (mark) {
        text = markWrapper(mark, text, markDefs);
      });
      return text;
    }).join("");
  }

  function pickStringField(source, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = source && source[keys[i]];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  }

  function normalizeCalloutTone(value) {
    var tone = window.SanityBridge.sanitizeSlug(value || "");
    if (tone === "success") {
      tone = "tip";
    }
    if (tone === "critical") {
      tone = "danger";
    }
    if (tone === "neutral") {
      tone = "note";
    }
    var allowed = ["note", "info", "tip", "warning", "danger"];
    if (allowed.indexOf(tone) === -1) {
      return "info";
    }
    return tone;
  }

  function normalizeDividerStyle(value) {
    var style = window.SanityBridge.sanitizeSlug(value || "");
    if (style === "dashed" || style === "dotted") {
      return style;
    }
    return "solid";
  }

  function readTableCell(cell) {
    if (typeof cell === "string") {
      return cell;
    }
    if (typeof cell === "number" || typeof cell === "boolean") {
      return String(cell);
    }
    if (cell && typeof cell === "object") {
      if (typeof cell.text === "string") {
        return cell.text;
      }
      if (typeof cell.value === "string") {
        return cell.value;
      }
      if (typeof cell.content === "string") {
        return cell.content;
      }
    }
    return "";
  }

  function renderTable(block) {
    var rows = Array.isArray(block.rows) ? block.rows : [];
    if (!rows.length) {
      return "";
    }
    var caption = pickStringField(block, ["caption", "title", "label"]);

    var normalizedRows = rows.map(function (row) {
      var cells = Array.isArray(row && row.cells) ? row.cells : (Array.isArray(row) ? row : []);
      return cells.map(readTableCell);
    }).filter(function (cells) {
      return cells.length > 0;
    });

    if (!normalizedRows.length) {
      return "";
    }

    var useHeader = normalizedRows.length > 1;
    var parts = ["<figure class=\"article-table-wrap\"><div class=\"article-table-scroll\"><table class=\"article-table\">"];

    if (useHeader) {
      parts.push("<thead><tr>");
      normalizedRows[0].forEach(function (cell) {
        var text = window.SanityBridge.escapeHtml(cell);
        parts.push("<th scope=\"col\">" + (text || "&nbsp;") + "</th>");
      });
      parts.push("</tr></thead>");
    }

    var bodyRows = useHeader ? normalizedRows.slice(1) : normalizedRows;
    parts.push("<tbody>");
    bodyRows.forEach(function (cells) {
      parts.push("<tr>");
      cells.forEach(function (cell) {
        var text = window.SanityBridge.escapeHtml(cell);
        parts.push("<td>" + (text || "&nbsp;") + "</td>");
      });
      parts.push("</tr>");
    });
    parts.push("</tbody></table></div>");
    if (caption) {
      parts.push("<figcaption class=\"article-table-caption\">" + window.SanityBridge.escapeHtml(caption) + "</figcaption>");
    }
    parts.push("</figure>");

    return parts.join("");
  }

  function renderCallout(block) {
    var tone = normalizeCalloutTone(
      pickStringField(block, ["tone", "variant", "style", "type"])
    );
    var title = pickStringField(block, ["title", "heading", "label"]);
    var message = pickStringField(block, ["text", "message", "description", "contentText", "bodyText", "body", "content"]);

    var nestedBlocks = null;
    if (Array.isArray(block.body)) {
      nestedBlocks = block.body;
    } else if (Array.isArray(block.content)) {
      nestedBlocks = block.content;
    }

    var bodyHtml = "";
    if (nestedBlocks) {
      bodyHtml = renderPortableText(nestedBlocks, { fallbackEmpty: false });
    } else if (message) {
      bodyHtml = "<p>" + window.SanityBridge.escapeHtml(message) + "</p>";
    }

    if (!title && !bodyHtml) {
      return "";
    }

    return [
      "<aside class=\"article-callout is-" + window.SanityBridge.escapeHtml(tone) + "\" role=\"note\">",
      title ? "<h4 class=\"article-callout-title\">" + window.SanityBridge.escapeHtml(title) + "</h4>" : "",
      "<div class=\"article-callout-body\">" + bodyHtml + "</div>",
      "</aside>"
    ].join("");
  }

  function renderPortableText(blocks, options) {
    var renderOptions = options || {};
    var fallbackEmpty = renderOptions.fallbackEmpty !== false;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return fallbackEmpty ? "<p>Este artículo todavía no tiene contenido publicado.</p>" : "";
    }

    var html = [];
    var activeListType = "";
    var activeListClass = "";
    var listItems = [];

    function flushList() {
      if (!activeListType || listItems.length === 0) {
        activeListType = "";
        activeListClass = "";
        listItems = [];
        return;
      }
      html.push("<" + activeListType + " class=\"" + activeListClass + "\">" + listItems.join("") + "</" + activeListType + ">");
      activeListType = "";
      activeListClass = "";
      listItems = [];
    }

    blocks.forEach(function (block) {
      if (!block) {
        return;
      }

      if (block._type === "block" && block.listItem) {
        var listItemKind = String(block.listItem).toLowerCase();
        var isChecklist = listItemKind === "check" || listItemKind === "checklist" || listItemKind === "checkmarks" || listItemKind === "checked";
        var listType = listItemKind === "number" ? "ol" : "ul";
        var listClass = isChecklist ? "article-list article-checklist" : "article-list";

        if (activeListType && (activeListType !== listType || activeListClass !== listClass)) {
          flushList();
        }
        activeListType = listType;
        activeListClass = listClass;
        listItems.push("<li>" + renderSpans(block) + "</li>");
        return;
      }

      flushList();

      if (block._type === "block") {
        var content = renderSpans(block);
        if (!content.trim()) {
          return;
        }
        var style = block.style || "normal";
        if (style === "h2") {
          html.push("<h2>" + content + "</h2>");
          return;
        }
        if (style === "h3") {
          html.push("<h3>" + content + "</h3>");
          return;
        }
        if (style === "h4") {
          html.push("<h4>" + content + "</h4>");
          return;
        }
        if (style === "blockquote") {
          html.push("<blockquote>" + content + "</blockquote>");
          return;
        }
        html.push("<p>" + content + "</p>");
        return;
      }

      if (block._type === "image") {
        var imageUrl = window.SanityBridge.toImageUrl(block.assetRef || block.assetUrl || "", {
          w: 1400,
          fit: "max",
          auto: "format",
          q: 84
        });
        if (imageUrl) {
          html.push(
            "<figure class=\"article-inline-image\">" +
              "<img loading=\"lazy\" decoding=\"async\" src=\"" + window.SanityBridge.escapeHtml(imageUrl) + "\" alt=\"" + window.SanityBridge.escapeHtml(block.alt || "Imagen del artículo") + "\">" +
              (block.caption ? "<figcaption>" + window.SanityBridge.escapeHtml(block.caption) + "</figcaption>" : "") +
            "</figure>"
          );
        }
      }

      if (block._type === "divider") {
        var dividerStyle = normalizeDividerStyle(
          pickStringField(block, ["style", "variant"])
        );
        html.push("<hr class=\"article-divider is-" + window.SanityBridge.escapeHtml(dividerStyle) + "\" role=\"separator\">");
        return;
      }

      if (block._type === "table") {
        var tableHtml = renderTable(block);
        if (tableHtml) {
          html.push(tableHtml);
        }
        return;
      }

      if (block._type === "callout") {
        var calloutHtml = renderCallout(block);
        if (calloutHtml) {
          html.push(calloutHtml);
        }
      }
    });

    flushList();
    return html.join("");
  }

  function showState(title, description, errorState) {
    if (heroKicker) {
      heroKicker.textContent = errorState ? "Estado" : "Publicación";
    }
    heroTitle.textContent = title;
    heroExcerpt.textContent = description;
    heroMeta.textContent = "";
    if (heroCover) {
      heroCover.innerHTML = "";
    }
    articleBody.innerHTML = [
      "<div class=\"article-state" + (errorState ? " is-error" : "") + "\">",
      "<p>" + window.SanityBridge.escapeHtml(description) + "</p>",
      "<a class=\"btn-accent\" href=\"blog.html\">Volver al blog</a>",
      "</div>"
    ].join("");
    if (articleContainer) {
      articleContainer.removeAttribute("aria-busy");
    }
  }

  function hydrateSeo(post, slug) {
    var seoTitle = post.seoMetaTitle || post.title;
    var title = seoTitle || "Artículo";
    var description = post.seoMetaDescription || post.excerpt || "Artículo del blog de EJEZ";
    var canonicalUrl = post.canonicalUrl || ("article.html?slug=" + encodeURIComponent(slug));

    document.title = title + " | EJEZ";
    setMetaTag("meta[name='description']", description);
    setMetaTag("meta[property='og:title']", title + " | EJEZ");
    setMetaTag("meta[property='og:description']", description);
    setMetaTag("meta[name='twitter:title']", title + " | EJEZ");
    setMetaTag("meta[name='twitter:description']", description);

    var coverUrl = window.SanityBridge.toImageUrl(post.seoOgAssetRef || post.coverAssetRef || post.coverUrl, {
      w: 1200,
      h: 630,
      fit: "crop",
      auto: "format",
      q: 82
    });
    if (coverUrl) {
      setMetaTag("meta[property='og:image']", coverUrl);
      setMetaTag("meta[name='twitter:image']", coverUrl);
    }

    setCanonical(canonicalUrl);
  }

  function renderPost(post, slug) {
    if (heroKicker) {
      heroKicker.textContent = getKindLabel(post.kind);
    }
    heroTitle.textContent = post.title || "Artículo sin título";
    heroExcerpt.textContent = post.excerpt || "Publicación del blog de EJEZ.";
    setMetaItems([
      window.SanityBridge.formatDate(post.publishedAt),
      post.authorName || "Equipo EJEZ",
      Number(post.readingTime) > 0 ? String(Math.round(post.readingTime)) + " min de lectura" : ""
    ]);

    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = post.title || "Artículo";
    }

    if (heroCover) {
      var heroImage = window.SanityBridge.toImageUrl(post.coverAssetRef || post.coverUrl, {
        w: 1600,
        h: 900,
        fit: "crop",
        auto: "format",
        q: 84
      });
      if (heroImage) {
        heroCover.innerHTML =
          "<img src=\"" + window.SanityBridge.escapeHtml(heroImage) + "\" alt=\"" + window.SanityBridge.escapeHtml(post.coverAlt || post.title || "Portada del artículo") + "\" width=\"1600\" height=\"900\" decoding=\"async\">";
      } else {
        heroCover.innerHTML = "<div class=\"article-cover-fallback\" aria-hidden=\"true\"></div>";
      }
    }

    articleBody.innerHTML = renderPortableText(post.body);
    hydrateSeo(post, slug);
    articleContainer.removeAttribute("aria-busy");
  }

  async function init() {
    if (!window.SanityBridge || !window.SanityBridge.isConfigured()) {
      showState(
        "Conexión pendiente",
        "Configura tu proyecto en js/sanity-config.js para habilitar el contenido dinámico del artículo.",
        false
      );
      return;
    }

    var slug = getSlugFromSearch();
    var kind = getKindFromSearch();
    if (!slug) {
      showState(
        "Artículo no encontrado",
        "No recibimos un slug válido para cargar la publicación solicitada.",
        true
      );
      return;
    }

    var postType = sanitizeDocType(window.SanityBridge.getConfig().postType);
    var requestedType = getTypeFromSearch();
    var fallbackTypeFilter = buildTypeFilter([postType, "entry", "post", "article", "blogPost", "blog", "nota"]);
    var kindFilter = kind ? " && kind == \"" + kind + "\"" : "";
    function buildArticleQuery(typeFilter) {
      return [
        "*[" + typeFilter + " && slug.current == \"" + escapeForGroq(slug) + "\" && defined(publishedAt) && publishedAt <= now()" + kindFilter + "] | order(publishedAt desc, _updatedAt desc)[0]{",
        "  _id,",
        "  \"docType\": _type,",
        "  kind,",
        "  title,",
        "  \"slug\": slug.current,",
        "  \"excerpt\": coalesce(excerpt, seo.metaDescription, \"\"),",
        "  publishedAt,",
        "  readingTime,",
        "  canonicalUrl,",
        "  \"coverAssetRef\": coverImage.asset->_ref,",
        "  \"coverUrl\": coverImage.asset->url,",
        "  \"coverAlt\": coalesce(coverImage.alt, title),",
        "  \"authorName\": coalesce(authors[0]->name, \"Equipo EJEZ\"),",
        "  \"seoMetaTitle\": seo.metaTitle,",
        "  \"seoMetaDescription\": seo.metaDescription,",
        "  \"seoOgAssetRef\": seo.ogImage.asset->_ref,",
        "  body[]{",
        "    ...,",
        "    _type == \"image\" => {",
        "      \"_type\": \"image\",",
        "      \"assetRef\": asset._ref,",
        "      \"assetUrl\": asset->url,",
        "      \"alt\": coalesce(alt, \"Imagen del artículo\"),",
        "      \"caption\": caption",
        "    }",
        "  }",
        "}"
      ].join("\n");
    }

    try {
      articleContainer.setAttribute("aria-busy", "true");
      var post = null;
      if (requestedType) {
        var requestedTypeFilter = buildTypeFilter([requestedType]);
        post = await window.SanityBridge.fetchQuery(buildArticleQuery(requestedTypeFilter), { cache: true });
      }
      if (!post) {
        post = await window.SanityBridge.fetchQuery(buildArticleQuery(fallbackTypeFilter), { cache: true });
      }
      if (!post) {
        showState(
          "Artículo no disponible",
          "El contenido no existe o todavía no está publicado.",
          true
        );
        return;
      }
      renderPost(post, slug);
    } catch (error) {
      showState(
        "No pudimos cargar el artículo",
        "Revisá la configuración de Sanity o tu conexión. " + (error && error.message ? error.message : ""),
        true
      );
    }
  }

  init();
})();
