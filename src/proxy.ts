import { NextRequest, NextResponse } from 'next/server';

const LOGIN_PATH = '/api/auth/login';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || '';

  // Enforce HTTPS on miyya.uz domain
  if ((host === 'miyya.uz' || host === 'www.miyya.uz') && proto === 'http') {
    const cleanHost = host.split(':')[0];
    const httpsUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${cleanHost}`);
    const response = NextResponse.redirect(httpsUrl, 301);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    return response;
  }

  if (!request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    if (host === 'miyya.uz' || host === 'www.miyya.uz') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    return response;
  }
  if (request.nextUrl.pathname === LOGIN_PATH && request.method.toUpperCase() === 'POST') {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    return response;
  }

  const session = request.cookies.get('labcontrol_session')?.value;
  if (!session) return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

  const method = request.method.toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const origin = request.headers.get('origin');
    if (process.env.NODE_ENV === 'production' && !process.env.LABCONTROL_PUBLIC_ORIGIN) {
      return NextResponse.json({ error: 'Server public origin sozlanmagan' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const allowedOrigins = [
      process.env.LABCONTROL_PUBLIC_ORIGIN,
      ...(process.env.LABCONTROL_ALLOWED_ORIGINS || '').split(',')
    ].map(value => value?.trim()).filter((value): value is string => Boolean(value));
    const host = request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const hostOrigin = host ? `${proto}://${host}` : undefined;
    const originAllowed = allowedOrigins.length > 0
      ? (allowedOrigins.includes(origin || '') || origin === hostOrigin || origin === request.nextUrl.origin)
      : (origin === request.nextUrl.origin || origin === hostOrigin);
    if (!originAllowed || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'So‘rov manbasi tasdiqlanmadi' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
