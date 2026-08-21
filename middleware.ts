import { middlewareAuth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';

export default middlewareAuth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const isAdmin = session?.user && (session.user as { role?: string }).role === 'admin';

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Protect app routes
  const protectedPaths = [
    '/dashboard', '/tenders', '/bids', '/profile', '/documents',
    '/messages', '/vendors', '/settings', '/companies',
  ];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p)) || pathname.startsWith('/offer');
  if (isProtected && !isLoggedIn) {
    const login = new URL('/login', req.url);
    login.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // Suppliers may participate in tenders (prepare offers) but cannot create or edit them
  const userType = session?.user && (session.user as { userType?: string | null }).userType;
  if (userType === 'vendor') {
    if (pathname === '/tenders/new' || /^\/tenders\/[^/]+\/edit$/.test(pathname)) {
      return NextResponse.redirect(new URL('/tenders', req.url));
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin') && !isAdmin) {
    if (!isLoggedIn) return NextResponse.redirect(new URL('/login', req.url));
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
