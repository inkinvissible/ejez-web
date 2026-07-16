export async function onRequest(context) {
  const { request, env, next } = context;
  const accept = request.headers.get('Accept') || '';

  if (accept.includes('text/markdown')) {
    const url = new URL(request.url);
    let mdPath = url.pathname;
    
    if (mdPath.endsWith('/')) {
      mdPath += 'index.md';
    } else if (mdPath.endsWith('.html')) {
      mdPath = mdPath.replace(/\.html$/, '.md');
    } else {
      // Extensionless path, e.g., /blog -> /blog.md
      mdPath += '.md';
    }

    // Try to fetch the markdown file
    const mdUrl = new URL(mdPath, request.url);
    const mdRequest = new Request(mdUrl, request);
    let mdResponse = await env.ASSETS.fetch(mdRequest);

    // If not found, try adding /index.md just in case it's a directory
    if (!mdResponse.ok && !mdPath.endsWith('index.md')) {
      const fallbackUrl = new URL(url.pathname.replace(/\/?$/, '/index.md'), request.url);
      mdResponse = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    if (mdResponse.ok) {
      // Create a new response to override headers
      const newResponse = new Response(mdResponse.body, mdResponse);
      newResponse.headers.set('Content-Type', 'text/markdown; charset=utf-8');
      return newResponse;
    }
  }

  // Fallback to normal behavior
  return next();
}
