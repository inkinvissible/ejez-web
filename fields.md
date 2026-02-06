# EjeZ Sanity Frontend Fields

This document describes the fields the frontend can expect to receive from Sanity for the current schemas. All fields are from the `production` dataset and follow Sanity default shapes unless stated otherwise.

## Common Field Shapes

**Slug**

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | `{_type: 'slug', current: string}` | `current` is the URL-friendly string. |

**Reference**

| Field | Type | Notes |
| --- | --- | --- |
| `author` / `tag` | `{_type: 'reference', _ref: string}` | Resolve via GROQ projections. |

**Image**

| Field | Type | Notes |
| --- | --- | --- |
| `coverImage` / `photo` / `defaultOgImage` / `seo.ogImage` / `body[]` image | `{_type: 'image', asset: {_type: 'reference', _ref: string}, ...}` | Use `@sanity/image-url` or Sanity image pipeline. May include `crop` and `hotspot`. |

**Datetime**

| Field | Type | Notes |
| --- | --- | --- |
| `publishedAt` | `string` | ISO 8601 date-time string or `undefined` for drafts. |

## Document: `entry`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | `string` | yes | Sanity document id. |
| `_type` | `'entry'` | yes | Document type. |
| `kind` | `'bitacora' | 'nota' | 'lab'` | yes | Section type. |
| `title` | `string` | yes | 3-120 chars. |
| `slug` | `slug` | yes | Unique per `kind`. |
| `excerpt` | `string` | no | Max 180 chars. |
| `body` | `PortableText[]` | yes | Blocks + inline images. |
| `coverImage` | `image` | no | With hotspot. |
| `authors` | `reference[]` | no | References to `author`. |
| `tags` | `reference[]` | no | References to `tag`. |
| `featured` | `boolean` | no | Defaults `false`. |
| `publishedAt` | `datetime` | no | If empty, treat as draft. |
| `readingTime` | `number` | no | Minutes, 1-120. |
| `canonicalUrl` | `string` | no | URL string. |
| `seo` | `{metaTitle?, metaDescription?, ogImage?}` | no | Optional SEO object. |
| `internalNotes` | `string` | no | For internal use. |

### Portable Text: `body` array

`body` supports two block types:

1. Text blocks
   - `_type: 'block'`
   - `children: Array<{_type: 'span', text: string, marks?: string[]}>`
   - `style` (e.g. `normal`, `h2`, etc.)
2. Inline images
   - `_type: 'image'`
   - `asset: {_type: 'reference', _ref: string}`
   - `alt?: string`
   - `caption?: string`

## Document: `author`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | `string` | yes | Sanity document id. |
| `_type` | `'author'` | yes | Document type. |
| `name` | `string` | yes | 2-80 chars. |
| `role` | `string` | no | Optional role label. |
| `photo` | `image` | no | With hotspot. |
| `bio` | `string` | no | Max 400 chars. |
| `social` | `{linkedin?, website?}` | no | URLs only. |

## Document: `tag`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | `string` | yes | Sanity document id. |
| `_type` | `'tag'` | yes | Document type. |
| `title` | `string` | yes | 2-40 chars. |
| `slug` | `slug` | yes | From `title`. |

## Document: `siteSettings` (Singleton)

Document id: `siteSettings`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | `string` | yes | Should be `siteSettings`. |
| `_type` | `'siteSettings'` | yes | Document type. |
| `siteTitle` | `string` | yes | 2-80 chars. |
| `siteDescription` | `string` | no | Max 200 chars. |
| `defaultOgImage` | `image` | no | With hotspot. |
| `footerText` | `string` | no | Max 200 chars. |
| `contactEmail` | `string` | no | Email string. |
| `whatsappNumber` | `string` | no | Phone-like string. |

## Notes

- `publishedAt` is optional. When missing, treat the entry as a draft.
- Use GROQ projections to resolve references (authors/tags) and image asset metadata.
- Image objects may contain `crop` and `hotspot` depending on editor use.
- Date examples in the Studio are based on 2026-02-06.
