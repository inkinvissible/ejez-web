import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, ".site");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeSiteUrl(value) {
  const raw = String(value || "").trim();
  return raw.replace(/\/+$/, "");
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function toImageUrl(assetRefOrUrl, config, options = {}) {
  if (!assetRefOrUrl) return "";

  let baseUrl = "";
  if (typeof assetRefOrUrl === "string" && assetRefOrUrl.startsWith("http")) {
    baseUrl = assetRefOrUrl;
  } else if (typeof assetRefOrUrl === "string") {
    const match = assetRefOrUrl.match(/^image-([^-]+)-(\d+x\d+)-([a-z0-9]+)$/i);
    if (!match) return "";
    baseUrl = `https://cdn.sanity.io/images/${config.projectId}/${config.dataset}/${match[1]}-${match[2]}.${match[3]}`;
  } else {
    return "";
  }

  const params = new URLSearchParams();
  if (options.w) params.set("w", String(options.w));
  if (options.h) params.set("h", String(options.h));
  if (options.fit) params.set("fit", String(options.fit));
  if (options.auto) params.set("auto", String(options.auto));
  if (options.q) params.set("q", String(options.q));
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale || "es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function sanitizeConfig(rawConfig) {
  const envSiteUrl = process.env.SITE_URL || "";
  const envProjectId = process.env.SANITY_PROJECT_ID || "";
  const envDataset = process.env.SANITY_DATASET || "";
  const envApiVersion = process.env.SANITY_API_VERSION || "";

  const config = {
    siteUrl: normalizeSiteUrl(envSiteUrl || rawConfig.siteUrl || ""),
    projectId: String(envProjectId || rawConfig.projectId || "").trim(),
    dataset: String(envDataset || rawConfig.dataset || "production").trim(),
    apiVersion: String(envApiVersion || rawConfig.apiVersion || "2025-02-01").trim(),
    postType: String(rawConfig.postType || "entry").trim(),
    entryKinds: Array.isArray(rawConfig.entryKinds) ? rawConfig.entryKinds : [],
    defaultLocale: String(rawConfig.defaultLocale || "es-AR")
  };

  if (!config.siteUrl) {
    throw new Error("Missing siteUrl. Set it in sanity.build.config.json or SITE_URL env.");
  }
  if (!config.projectId) {
    throw new Error("Missing projectId. Set it in sanity.build.config.json or SANITY_PROJECT_ID env.");
  }
  return config;
}

function buildKindsFilter(kinds) {
  if (!Array.isArray(kinds) || kinds.length === 0) {
    return "";
  }
  const sanitized = kinds
    .map((kind) => slugify(kind))
    .filter(Boolean);
  if (!sanitized.length) return "";
  return ` && kind in [${sanitized.map((kind) => `"${kind}"`).join(", ")}]`;
}

function sanitizeDocType(value) {
  const type = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(type)) return "";
  return type;
}

function buildPostTypeFilter(postTypes) {
  const list = Array.isArray(postTypes) ? postTypes : [postTypes];
  const sanitized = list
    .map(sanitizeDocType)
    .filter((type, index, values) => Boolean(type) && values.indexOf(type) === index);
  if (!sanitized.length) return "";
  if (sanitized.length === 1) return `_type == "${sanitized[0]}"`;
  return `_type in [${sanitized.map((type) => `"${type}"`).join(", ")}]`;
}

function renderSpanText(block) {
  const markDefs = new Map((block.markDefs || []).map((item) => [item._key, item]));
  const children = Array.isArray(block.children) ? block.children : [];

  return children.map((child) => {
    if (!child || child._type !== "span") return "";
    let html = escapeHtml(child.text || "").replace(/\n/g, "<br>");
    const marks = Array.isArray(child.marks) ? child.marks : [];

    for (const mark of marks) {
      if (mark === "strong" || mark === "bold" || mark === "b") {
        html = `<strong>${html}</strong>`;
      } else if (mark === "em") {
        html = `<em>${html}</em>`;
      } else if (mark === "code") {
        html = `<code>${html}</code>`;
      } else {
        const def = markDefs.get(mark);
        if (def && def._type === "link" && def.href) {
          const href = String(def.href).trim();
          const safeHref = /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : "";
          if (safeHref) {
            const external = /^https?:/i.test(safeHref);
            html = `<a href="${escapeHtml(safeHref)}"${external ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${html}</a>`;
          }
        }
      }
    }
    return html;
  }).join("");
}

function pickStringField(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeCalloutTone(value) {
  let tone = slugify(value || "");
  if (tone === "success") tone = "tip";
  if (tone === "critical") tone = "danger";
  if (tone === "neutral") tone = "note";
  const allowed = ["note", "info", "tip", "warning", "danger"];
  return allowed.includes(tone) ? tone : "info";
}

function normalizeDividerStyle(value) {
  const style = slugify(value || "");
  if (style === "dashed" || style === "dotted") return style;
  return "solid";
}

function readTableCell(cell) {
  if (typeof cell === "string") return cell;
  if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
  if (cell && typeof cell === "object") {
    if (typeof cell.text === "string") return cell.text;
    if (typeof cell.value === "string") return cell.value;
    if (typeof cell.content === "string") return cell.content;
  }
  return "";
}

function renderTableBlock(block) {
  const rows = Array.isArray(block.rows) ? block.rows : [];
  if (!rows.length) return "";
  const caption = pickStringField(block, ["caption", "title", "label"]);

  const normalizedRows = rows
    .map((row) => {
      const cells = Array.isArray(row?.cells) ? row.cells : (Array.isArray(row) ? row : []);
      return cells.map(readTableCell);
    })
    .filter((cells) => cells.length > 0);

  if (!normalizedRows.length) return "";

  const useHeader = normalizedRows.length > 1;
  let html = "<figure class=\"article-table-wrap\"><div class=\"article-table-scroll\"><table class=\"article-table\">";

  if (useHeader) {
    html += "<thead><tr>";
    for (const cell of normalizedRows[0]) {
      const text = escapeHtml(cell);
      html += `<th scope="col">${text || "&nbsp;"}</th>`;
    }
    html += "</tr></thead>";
  }

  html += "<tbody>";
  const bodyRows = useHeader ? normalizedRows.slice(1) : normalizedRows;
  for (const cells of bodyRows) {
    html += "<tr>";
    for (const cell of cells) {
      const text = escapeHtml(cell);
      html += `<td>${text || "&nbsp;"}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  if (caption) {
    html += `<figcaption class="article-table-caption">${escapeHtml(caption)}</figcaption>`;
  }
  html += "</figure>";

  return html;
}

function renderCalloutBlock(block, config) {
  const tone = normalizeCalloutTone(
    pickStringField(block, ["tone", "variant", "style", "type"])
  );
  const title = pickStringField(block, ["title", "heading", "label"]);
  const message = pickStringField(block, ["text", "message", "description", "contentText", "bodyText", "body", "content"]);
  const nestedBlocks = Array.isArray(block.body) ? block.body : (Array.isArray(block.content) ? block.content : null);

  let bodyHtml = "";
  if (nestedBlocks) {
    bodyHtml = renderPortableText(nestedBlocks, config, { fallbackEmpty: false });
  } else if (message) {
    bodyHtml = `<p>${escapeHtml(message)}</p>`;
  }

  if (!title && !bodyHtml) {
    return "";
  }

  return `<aside class="article-callout is-${escapeHtml(tone)}" role="note">${
    title ? `<h4 class="article-callout-title">${escapeHtml(title)}</h4>` : ""
  }<div class="article-callout-body">${bodyHtml}</div></aside>`;
}

function renderPortableText(blocks, config, options = {}) {
  const fallbackEmpty = options.fallbackEmpty !== false;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return fallbackEmpty ? "<p>Este artículo todavía no tiene contenido publicado.</p>" : "";
  }

  let html = "";
  let activeList = "";
  let activeListClass = "";
  let listItems = [];

  const flushList = () => {
    if (!activeList || listItems.length === 0) {
      activeList = "";
      activeListClass = "";
      listItems = [];
      return;
    }
    html += `<${activeList} class="${activeListClass}">${listItems.join("")}</${activeList}>`;
    activeList = "";
    activeListClass = "";
    listItems = [];
  };

  for (const block of blocks) {
    if (!block) continue;

    if (block._type === "block" && block.listItem) {
      const listItemKind = String(block.listItem).toLowerCase();
      const isChecklist = listItemKind === "check" || listItemKind === "checklist" || listItemKind === "checkmarks" || listItemKind === "checked";
      const nextListType = listItemKind === "number" ? "ol" : "ul";
      const nextListClass = isChecklist ? "article-list article-checklist" : "article-list";
      if (activeList && (activeList !== nextListType || activeListClass !== nextListClass)) flushList();
      activeList = nextListType;
      activeListClass = nextListClass;
      listItems.push(`<li>${renderSpanText(block)}</li>`);
      continue;
    }

    flushList();

    if (block._type === "block") {
      const content = renderSpanText(block);
      if (!content.trim()) continue;
      const style = block.style || "normal";
      if (style === "h2") html += `<h2>${content}</h2>`;
      else if (style === "h3") html += `<h3>${content}</h3>`;
      else if (style === "h4") html += `<h4>${content}</h4>`;
      else if (style === "blockquote") html += `<blockquote>${content}</blockquote>`;
      else html += `<p>${content}</p>`;
      continue;
    }

    if (block._type === "image") {
      const imageUrl = toImageUrl(block.assetRef || block.assetUrl || "", config, {
        w: 1400,
        fit: "max",
        auto: "format",
        q: 84
      });
      if (!imageUrl) continue;
      html += "<figure class=\"article-inline-image\">";
      html += `<img loading="lazy" decoding="async" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(block.alt || "Imagen del artículo")}">`;
      if (block.caption) {
        html += `<figcaption>${escapeHtml(block.caption)}</figcaption>`;
      }
      html += "</figure>";
    }

    if (block._type === "divider") {
      const dividerStyle = normalizeDividerStyle(
        pickStringField(block, ["style", "variant"])
      );
      html += `<hr class="article-divider is-${escapeHtml(dividerStyle)}" role="separator">`;
      continue;
    }

    if (block._type === "table") {
      html += renderTableBlock(block);
      continue;
    }

    if (block._type === "callout") {
      html += renderCalloutBlock(block, config);
    }
  }

  flushList();
  return html;
}

function getKindLabel(kind) {
  const map = {
    bitacora: "Bitacora",
    nota: "Nota",
    lab: "Lab"
  };
  return map[kind] || "Entrada";
}

function articleFileName(entry) {
  const kind = slugify(entry.kind || "entry");
  const slug = slugify(entry.slug || "sin-slug");
  return `article-${kind}-${slug}.html`;
}

function articleRouteSlug(entry) {
  const kind = slugify(entry.kind || "entry");
  const slug = slugify(entry.slug || "sin-slug");
  return `${kind}-${slug}`;
}

function articleRoutePath(entry) {
  return `blog/${articleRouteSlug(entry)}/`;
}

function pageHead({
  title,
  description,
  canonical,
  ogType,
  ogImage,
  locale,
  baseHref
}) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#F5F0E6">
  ${baseHref ? `<base href="${escapeHtml(baseHref)}">` : ""}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:locale" content="${escapeHtml(locale.replace("-", "_"))}">
  <meta property="og:site_name" content="EJEZ">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="stylesheet" type="text/css" href="css/normalize.css">
  <link rel="stylesheet" type="text/css" href="fonts/icomoon/icomoon.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" type="text/css" href="fonts/icomoon/icomoon.css"></noscript>
  <link rel="stylesheet" type="text/css" href="css/vendor.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" type="text/css" href="css/vendor.css"></noscript>
  <link rel="stylesheet" type="text/css" href="style.css">
  <link rel="stylesheet" type="text/css" href="css/blog.css">
  <link rel="preload" href="images/logo-ejez.svg" as="image" type="image/svg+xml">
</head>`;
}

function renderNav(active) {
  const li = (name, href, label) => {
    const isActive = active === name;
    return `<li class="menu-item${isActive ? " active" : ""}"><a href="${href}" class="nav-link"${isActive ? " aria-current=\"page\"" : ""}>${label}</a></li>`;
  };

  return `<div id="header-wrap">
  <header id="header">
    <div class="container">
      <div class="inner-content">
        <div class="grid">
          <div class="main-logo">
            <a href="index.html">
              <img src="images/logo-ejez.svg" alt="Logo de EJEZ" width="136" height="136" decoding="async">
            </a>
          </div>
          <nav id="navbar" aria-label="Navegación principal">
            <div class="main-menu">
              <ul class="menu-list" id="primary-menu">
                ${li("inicio", "index.html#billboard", "Inicio")}
                ${li("servicios", "index.html#services", "Servicios")}
                ${li("proceso", "index.html#procedure", "Proceso")}
                ${li("blog", "blog.html", "Blog")}
                ${li("contacto", "index.html#footer", "Contacto")}
              </ul>
              <button class="hamburger" type="button" aria-controls="primary-menu" aria-expanded="false" aria-label="Abrir menu principal">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
              </button>
            </div>
            <a href="index.html#services" class="btn-hvr-effect">
              <span>Ver Servicios</span>
              <i class="icon icon-long-arrow-right"></i>
            </a>
          </nav>
        </div>
      </div>
    </div>
  </header>
</div>`;
}

function renderFooter(footerText) {
  return `<footer class="blog-footer">
  <div class="container">
    <div class="grid">
      <p>${escapeHtml(footerText || `© ${new Date().getFullYear()} EJEZ. Todos los derechos reservados.`)}</p>
      <nav class="blog-footer-nav" aria-label="Navegación secundaria">
        <a href="index.html">Landing</a>
        <a href="blog.html">Blog</a>
        <a href="index.html#services">Servicios</a>
        <a href="index.html#footer">Contacto</a>
      </nav>
    </div>
  </div>
</footer>`;
}

function blogCard(entry, config) {
  const cover = toImageUrl(entry.coverAssetRef || entry.coverUrl, config, {
    w: 900,
    h: 620,
    fit: "crop",
    auto: "format",
    q: 82
  });
  const primaryTag = Array.isArray(entry.tagTitles) && entry.tagTitles[0] ? entry.tagTitles[0] : getKindLabel(entry.kind);
  const authors = Array.isArray(entry.authorNames) && entry.authorNames.length ? entry.authorNames.filter(Boolean).join(", ") : "Equipo EJEZ";
  const readTime = Number(entry.readingTime) > 0 ? ` · ${Math.round(entry.readingTime)} min` : "";
  const excerpt = String(entry.excerpt || "").trim() || "Sin extracto disponible para este artículo.";
  const href = `${config.siteUrl}/${articleRoutePath(entry)}`;

  return `<article class="blog-card">
  <a class="blog-card-media" href="${escapeHtml(href)}" aria-label="Abrir artículo ${escapeHtml(entry.title || "sin título")}">
    ${cover
      ? `<img loading="lazy" decoding="async" src="${escapeHtml(cover)}" alt="${escapeHtml(entry.coverAlt || entry.title || "Portada del artículo")}" width="900" height="620">`
      : "<div class=\"blog-card-image-fallback\" aria-hidden=\"true\"></div>"}
  </a>
  <div class="blog-card-content">
    <div class="blog-card-meta">
      <span class="blog-card-category">${escapeHtml(primaryTag)}</span>
      <span class="blog-card-date">${escapeHtml(formatDate(entry.publishedAt, config.defaultLocale))}</span>
    </div>
    <h2 class="blog-card-title"><a href="${escapeHtml(href)}">${escapeHtml(entry.title || "Artículo sin título")}</a></h2>
    <p class="blog-card-excerpt">${escapeHtml(excerpt)}</p>
    <p class="blog-card-author">Por ${escapeHtml(authors)}${readTime}</p>
  </div>
</article>`;
}

function renderBlogPage(entries, config, siteSettings) {
  const title = `Blog ${siteSettings.siteTitle || "EJEZ"} | Desarrollo Web, UX y Automatizaciones`;
  const description = siteSettings.siteDescription || "Blog técnico sobre desarrollo web, UX/UI y automatización de procesos.";
  const canonical = `${config.siteUrl}/blog.html`;
  const ogImage = toImageUrl(siteSettings.defaultOgImageRef || siteSettings.defaultOgImageUrl, config, {
    w: 1200,
    h: 630,
    fit: "crop",
    auto: "format",
    q: 82
  }) || `${config.siteUrl}/images/logo.webp`;

  const mainContent = entries.length
    ? entries.map((entry) => blogCard(entry, config)).join("\n")
    : `<article class="blog-state-card"><h2>Sin artículos publicados</h2><p>Publicá una entrada en Sanity Studio para verla aquí.</p></article>`;

  return `${pageHead({
    title,
    description,
    canonical,
    ogType: "website",
    ogImage,
    locale: config.defaultLocale,
    baseHref: `${config.siteUrl}/`
  })}
<body class="blog-shell">
${renderNav("blog")}
<main class="blog-main">
  <section class="blog-hero" aria-labelledby="blog-title">
    <div class="container">
      <div class="blog-hero-content">
        <p class="section-kicker">Revista EJEZ</p>
        <h1 class="section-title" id="blog-title">Ideas de desarrollo web, UX y automatización empresarial</h1>
        <p class="section-lead">Contenido técnico y estratégico para equipos que quieren construir productos sólidos, escalar operaciones y decidir con claridad.</p>
      </div>
    </div>
  </section>
  <section class="blog-feed-section" aria-label="Listado de artículos">
    <div class="container">
      <div class="blog-toolbar">
        <h2>Últimos artículos</h2>
        <p>Contenido generado automáticamente desde Sanity Studio.</p>
      </div>
      <div class="blog-feed-grid">
        ${mainContent}
      </div>
    </div>
  </section>
</main>
${renderFooter(siteSettings.footerText)}
<script src="js/blog-shell.js" defer></script>
<script type="application/ld+json">${jsonLd({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: siteSettings.siteTitle || "Blog EJEZ",
    url: canonical,
    description
  })}</script>
</body>
</html>`;
}

function renderArticlePage(entry, config, siteSettings) {
  const entryTitle = entry.seoMetaTitle || entry.title || "Artículo";
  const description = entry.seoMetaDescription || entry.excerpt || siteSettings.siteDescription || "Artículo del blog de EJEZ.";
  const canonical = entry.canonicalUrl || `${config.siteUrl}/${articleRoutePath(entry)}`;

  const cover = toImageUrl(entry.coverAssetRef || entry.coverUrl, config, {
    w: 1600,
    h: 900,
    fit: "crop",
    auto: "format",
    q: 84
  });
  const ogImage = toImageUrl(entry.seoOgAssetRef || entry.coverAssetRef || entry.coverUrl, config, {
    w: 1200,
    h: 630,
    fit: "crop",
    auto: "format",
    q: 82
  }) || `${config.siteUrl}/images/logo.webp`;

  const authors = Array.isArray(entry.authorNames) && entry.authorNames.length ? entry.authorNames.filter(Boolean).join(", ") : "Equipo EJEZ";
  const readTime = Number(entry.readingTime) > 0 ? `${Math.round(entry.readingTime)} min de lectura` : "";
  const publishMeta = [formatDate(entry.publishedAt, config.defaultLocale), authors, readTime]
    .filter(Boolean)
    .map((item) => `<span class="article-meta-item">${escapeHtml(item)}</span>`)
    .join("");
  const articleBody = renderPortableText(entry.body, config);

  const jsonLdPayload = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: entryTitle,
    description,
    datePublished: entry.publishedAt || undefined,
    mainEntityOfPage: canonical,
    image: ogImage,
    author: authors ? { "@type": "Person", name: authors } : undefined,
    publisher: {
      "@type": "Organization",
      name: siteSettings.siteTitle || "EJEZ",
      logo: {
        "@type": "ImageObject",
        url: `${config.siteUrl}/images/logo-ejez.svg`
      }
    }
  };

  return `${pageHead({
    title: `${entryTitle} | EJEZ`,
    description,
    canonical,
    ogType: "article",
    ogImage,
    locale: config.defaultLocale,
    baseHref: `${config.siteUrl}/`
  })}
<body class="blog-shell article-view">
${renderNav("blog")}
<main class="article-main">
  <div class="container">
    <article class="article-layout">
      <nav class="article-breadcrumbs" aria-label="Breadcrumb">
        <a href="index.html">Inicio</a>
        <span class="article-breadcrumbs-separator">/</span>
        <a href="blog.html">Blog</a>
        <span class="article-breadcrumbs-separator">/</span>
        <span>${escapeHtml(entry.title || "Artículo")}</span>
      </nav>
      <header class="article-header">
        <p class="section-kicker" id="article-kicker">${escapeHtml(getKindLabel(entry.kind))}</p>
        <h1 class="section-title">${escapeHtml(entry.title || "Artículo sin título")}</h1>
        <p class="section-lead">${escapeHtml(entry.excerpt || description)}</p>
        <p class="article-meta">${publishMeta}</p>
      </header>
      <div class="article-cover">
        ${cover
          ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(entry.coverAlt || entry.title || "Portada del artículo")}" width="1600" height="900" decoding="async">`
          : "<div class=\"article-cover-fallback\" aria-hidden=\"true\"></div>"}
      </div>
      <div class="article-body-wrap">
        <div class="article-body">
          ${articleBody}
        </div>
      </div>
    </article>
    <div class="article-footer-link">
      <a href="blog.html" class="btn-outline-accent">Ver más artículos</a>
    </div>
  </div>
</main>
${renderFooter(siteSettings.footerText)}
<script src="js/blog-shell.js" defer></script>
<script type="application/ld+json">${jsonLd(jsonLdPayload)}</script>
</body>
</html>`;
}

async function readBuildConfig() {
  const configPath = path.join(rootDir, "sanity.build.config.json");
  const file = await fs.readFile(configPath, "utf8");
  return sanitizeConfig(JSON.parse(file));
}

async function sanityFetchQuery(query, config) {
  const baseUrl = `https://${config.projectId}.apicdn.sanity.io/v${config.apiVersion}/data/query/${config.dataset}`;
  const url = `${baseUrl}?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload?.error?.description ? ` ${payload.error.description}` : "";
    } catch {
      // Ignore parsing errors.
    }
    throw new Error(`Sanity query failed (${response.status}).${details}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.description || "Sanity query failed.");
  }
  return payload.result;
}

async function getEntries(config) {
  const buildEntriesQuery = (postTypes, kinds) => {
    const kindsFilter = buildKindsFilter(kinds);
    const typeFilter = buildPostTypeFilter(postTypes);
    const filter = `${typeFilter ? `${typeFilter} && ` : ""}defined(title) && defined(coalesce(slug.current, slug)) && (!defined(publishedAt) || publishedAt <= now())${kindsFilter}`;
    return [
      `*[${filter}]`,
      "| order(coalesce(publishedAt, _createdAt) desc){",
      "  _id,",
      "  kind,",
      "  title,",
      "  \"slug\": coalesce(slug.current, slug),",
      "  excerpt,",
      "  publishedAt,",
      "  readingTime,",
      "  canonicalUrl,",
      "  \"coverAssetRef\": coverImage.asset._ref,",
      "  \"coverUrl\": coverImage.asset->url,",
      "  \"coverAlt\": coalesce(coverImage.alt, title),",
      "  \"seoMetaTitle\": seo.metaTitle,",
      "  \"seoMetaDescription\": seo.metaDescription,",
      "  \"seoOgAssetRef\": seo.ogImage.asset._ref,",
      "  \"authorNames\": coalesce(authors[]->name, []),",
      "  \"tagTitles\": coalesce(tags[]->title, []),",
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
  };

  const primaryTypes = [config.postType];
  let entries = await sanityFetchQuery(buildEntriesQuery(primaryTypes, config.entryKinds), config);
  if (Array.isArray(entries) && entries.length > 0) {
    return entries;
  }

  const fallbackTypes = [config.postType, "entry", "post", "article", "blogPost", "blog", "nota"]
    .map(sanitizeDocType)
    .filter((type, index, list) => Boolean(type) && list.indexOf(type) === index);

  entries = await sanityFetchQuery(buildEntriesQuery(fallbackTypes, []), config);
  if (Array.isArray(entries) && entries.length > 0) {
    console.warn(`No entries for configured postType "${config.postType}". Using fallback types: ${fallbackTypes.join(", ")}.`);
    return entries;
  }

  return [];
}

async function getSiteSettings(config) {
  const query = "*[_type == \"siteSettings\"][0]{siteTitle, siteDescription, footerText, \"defaultOgImageRef\": defaultOgImage.asset._ref, \"defaultOgImageUrl\": defaultOgImage.asset->url}";
  const settings = await sanityFetchQuery(query, config);
  return settings || {};
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyDir(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  await ensureDir(destination);

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === ".site" || entry.name === "scripts" || entry.name === ".github" || entry.name === "node_modules") {
      continue;
    }
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

function sitemapXml(urls) {
  const urlNodes = urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

async function build() {
  const config = await readBuildConfig();

  await fs.rm(outputDir, { recursive: true, force: true });
  await copyDir(rootDir, outputDir);

  const [entries, siteSettings] = await Promise.all([
    getEntries(config),
    getSiteSettings(config)
  ]);

  const blogHtml = renderBlogPage(entries, config, siteSettings);
  await fs.writeFile(path.join(outputDir, "blog.html"), blogHtml, "utf8");
  await ensureDir(path.join(outputDir, "blog"));
  await fs.writeFile(path.join(outputDir, "blog", "index.html"), blogHtml, "utf8");

  const urls = [`${config.siteUrl}/`, `${config.siteUrl}/blog.html`, `${config.siteUrl}/blog/`];

  for (const entry of entries) {
    const fileName = articleFileName(entry);
    const routePath = articleRoutePath(entry);
    const html = renderArticlePage(entry, config, siteSettings);
    await fs.writeFile(path.join(outputDir, fileName), html, "utf8");
    await ensureDir(path.join(outputDir, routePath));
    await fs.writeFile(path.join(outputDir, routePath, "index.html"), html, "utf8");
    urls.push(entry.canonicalUrl || `${config.siteUrl}/${routePath}`);
    console.log(`Rendered article: ${fileName} and ${routePath}index.html`);
  }

  await fs.writeFile(path.join(outputDir, "sitemap.xml"), sitemapXml(urls), "utf8");
  await fs.writeFile(path.join(outputDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`, "utf8");
  await fs.writeFile(path.join(outputDir, ".nojekyll"), "", "utf8");

  console.log(`Static build completed. Entries rendered: ${entries.length}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
