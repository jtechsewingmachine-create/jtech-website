import { NextResponse, type NextRequest } from "next/server";

/**
 * Every registered path is lowercase. An uppercase variant has exactly one successor, so it gets a
 * 301 to the lowercase URL instead of being served as a duplicate (case-insensitive disks such as
 * macOS would otherwise serve the prerendered file with a 200).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === pathname.toLowerCase()) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = pathname.toLowerCase();
  return NextResponse.redirect(url, 301);
}

export const config = { matcher: ["/((?!_next/|api/).*)"] };
