/* global document, window */
(function () {
  "use strict";

  var heroTitle = document.getElementById("article-title");
  var heroExcerpt = document.getElementById("article-excerpt");
  var heroMeta = document.getElementById("article-meta");
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
    if (mark === "strong") {
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

  function renderPortableText(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return "<p>Este artículo todavía no tiene contenido publicado.</p>";
    }

    var html = [];
    var activeListType = "";
    var listItems = [];

    function flushList() {
      if (!activeListType || listItems.length === 0) {
        activeListType = "";
        listItems = [];
        return;
      }
      html.push("<" + activeListType + " class=\"article-list\">" + listItems.join("") + "</" + activeListType + ">");
      activeListType = "";
      listItems = [];
    }

    blocks.forEach(function (block) {
      if (!block) {
        return;
      }

      if (block._type === "block" && block.listItem) {
        var listType = block.listItem === "number" ? "ol" : "ul";
        if (activeListType && activeListType !== listType) {
          flushList();
        }
        activeListType = listType;
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
    });

    flushList();
    return html.join("");
  }

  function showState(title, description, errorState) {
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
    heroTitle.textContent = post.title || "Artículo sin título";
    heroExcerpt.textContent = post.excerpt || "Publicación del blog de EJEZ.";
    heroMeta.textContent = [
      window.SanityBridge.formatDate(post.publishedAt),
      post.authorName || "Equipo EJEZ",
      Number(post.readingTime) > 0 ? String(Math.round(post.readingTime)) + " min de lectura" : ""
    ].filter(Boolean).join(" · ");

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

    var postType = window.SanityBridge.getConfig().postType;
    var kindFilter = kind ? " && kind == \"" + kind + "\"" : "";
    var query = [
      "*[_type == \"" + postType + "\" && slug.current == \"" + slug + "\" && defined(publishedAt) && publishedAt <= now()" + kindFilter + "] | order(publishedAt desc)[0]{",
      "  _id,",
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

    try {
      articleContainer.setAttribute("aria-busy", "true");
      var post = await window.SanityBridge.fetchQuery(query, { cache: true });
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
