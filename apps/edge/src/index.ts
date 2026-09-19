/**
 * Edge router for pay.mitumba.africa.
 *
 * This Worker owns the hostname and routes by path. For `/widget` and
 * `/widget/*` it reverse-proxies to the widget's Cloudflare Pages deployment
 * (WIDGET_ORIGIN) — the domain is NOT bound to Pages directly; the Worker
 * fetches from the Pages URL and returns the response. Other paths are open for
 * future routing (landing page, API proxy, etc.).
 */

export interface Env {
  WIDGET_ORIGIN: string
}

// Headers that must not be forwarded verbatim across a proxy hop.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/widget' || pathname === '/widget/' || pathname.startsWith('/widget/')) {
      return proxyWidget(request, url, env)
    }

    if (pathname === '/' || pathname === '') {
      return new Response(rootPage(), {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function proxyWidget(request: Request, url: URL, env: Env): Promise<Response> {
  const origin = env.WIDGET_ORIGIN.replace(/\/+$/, '')
  // The Pages project serves its files at the origin ROOT (dist/ -> /). The
  // Worker owns the /widget prefix, so strip it before proxying:
  //   /widget            -> /
  //   /widget/           -> /
  //   /widget/assets/x   -> /assets/x
  const originPath = url.pathname.replace(/^\/widget(?=\/|$)/, '') || '/'
  const target = `${origin}${originPath}${url.search}`

  const proxied = await fetchOrigin(request, target)

  // SPA fallback: deep client routes (e.g. /widget/checkout/ord_123) won't exist
  // as files on Pages. Serve the widget's index.html so client-side routing can
  // resolve them, without changing this router later.
  if (proxied.status === 404 && request.method === 'GET' && isDocumentRequest(request)) {
    const indexResp = await fetchOrigin(request, `${origin}/index.html`)
    if (indexResp.ok) {
      return new Response(indexResp.body, {
        status: 200,
        headers: withHtmlType(stripHopByHop(indexResp.headers)),
      })
    }
  }

  return proxied
}

async function fetchOrigin(request: Request, target: string): Promise<Response> {
  const headers = stripHopByHop(request.headers)
  // Preserve original host context for the origin/logs.
  headers.set('x-forwarded-host', new URL(request.url).host)
  headers.set('x-forwarded-proto', 'https')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  const resp = await fetch(target, init)
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: stripHopByHop(resp.headers),
  })
}

function stripHopByHop(source: Headers): Headers {
  const out = new Headers()
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value)
  })
  return out
}

function withHtmlType(headers: Headers): Headers {
  headers.set('content-type', 'text/html; charset=utf-8')
  return headers
}

function isDocumentRequest(request: Request): boolean {
  const accept = request.headers.get('accept') ?? ''
  return accept.includes('text/html')
}

function rootPage(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mitumba Pay</title>
<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
display:flex;min-height:100vh;align-items:center;justify-content:center;
background:#F5F5F3;color:#1A1A1A}main{text-align:center;padding:24px}
h1{color:#3D9A52;margin:0 0 12px;font-size:40px;letter-spacing:-0.5px}
p{color:#6B6B6B;margin:0;font-size:17px;max-width:460px;line-height:1.6}</style>
</head><body>
<main>
<h1>Mitumba Pay</h1>
<p>Secure, provider-neutral payments for Africa — M-Pesa, Airtel Money, card, and more, through a single trusted checkout.</p>
</main></body></html>`
}
