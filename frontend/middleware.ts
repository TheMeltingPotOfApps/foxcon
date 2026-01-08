import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // All marketplace routes are now under /marketplace prefix
  // No subdomain routing needed - everything is on app.nurtureengine.net
  
  // Redirect old nurture-leads routes to marketplace
  if (pathname.startsWith('/nurture-leads')) {
    const newPath = pathname.replace('/nurture-leads', '/marketplace');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  if (pathname === '/nurture-leads-landing') {
    return NextResponse.redirect(new URL('/marketplace', request.url));
  }

  // For all other cases, let Next.js handle routing normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

