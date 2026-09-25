import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

type RouteContext = { params: Promise<{ path?: string[] }> };

function backendUrl(path: string[], search: string): string {
  const joined = path.filter(Boolean).join('/').replace(/\/+$/, '');
  return `${BACKEND_URL}/api/${joined}/${search}`;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const url = backendUrl(path, request.nextUrl.search);
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const headers = new Headers();
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.toLowerCase().includes('multipart/form-data');
    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'connection' || lower === 'content-length') return;
      if (isMultipart && lower === 'content-type') return;
      headers.set(key, value);
    });
    let body: BodyInit | undefined;
    if (hasBody && isMultipart) {
      const incoming = await request.formData();
      const outgoing = new FormData();
      incoming.forEach((value, key) => {
        outgoing.append(key, value);
      });
      body = outgoing;
    } else if (hasBody) {
      body = await request.arrayBuffer();
    }
    const upstream = await fetch(url, {
      method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
    const out = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'transfer-encoding') out.set(key, value);
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: out,
    });
  } catch (error) {
    console.error('Admin API proxy failed', { url, error });
    return NextResponse.json(
      {
        success: false,
        message: `Could not reach the backend at ${BACKEND_URL}. Set BACKEND_URL in admin/.env.`,
        data: null,
        errors: [],
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
