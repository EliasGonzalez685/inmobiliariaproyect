import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// La sesión NO queda abierta indefinidamente:
//  · las cookies de sesión se emiten sin fecha de caducidad (se borran al cerrar el navegador);
//  · si pasan más de MINUTOS_INACTIVIDAD sin usar el sistema, se pide iniciar sesión otra vez.
const MINUTOS_INACTIVIDAD = 30;
const COOKIE_ACTIVIDAD = 'ultima_actividad';
// Cada vez que se (re)inicia el servidor cambia este identificador: las sesiones abiertas antes del reinicio
// dejan de valer y el sistema vuelve a empezar en el login.
const COOKIE_ARRANQUE = 'arranque_id';
const ARRANQUE = crypto.randomUUID();

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const seguro = request.nextUrl.protocol === 'https:';

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Verifica el token de forma local (sin viajar a Supabase en cada página) y lo renueva si hace falta.
  // Si la cookie de sesión está dañada o vencida de un uso anterior, se descarta en lugar de romper la página.
  let user: { sub?: string } | null = null;
  let cookieDanada = false;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ?? null;
  } catch {
    cookieDanada = true;
  }

  const { pathname } = request.nextUrl;
  const esLogin = pathname.startsWith('/login');
  const ahora = Date.now();
  const ultima = Number(request.cookies.get(COOKIE_ACTIVIDAD)?.value ?? 0);
  const expirada = !!user && (!ultima || ahora - ultima > MINUTOS_INACTIVIDAD * 60_000);
  const arranqueOk = request.cookies.get(COOKIE_ARRANQUE)?.value === ARRANQUE;
  const sesionAnterior = !!user && !arranqueOk;
  const marcar = (res: NextResponse) => {
    if (!arranqueOk) res.cookies.set(COOKIE_ARRANQUE, ARRANQUE, { path: '/', sameSite: 'lax', secure: seguro });
    return res;
  };

  // Sesión vencida por inactividad (o abierta de un uso anterior): se borra y se pide ingresar de nuevo.
  if (expirada || cookieDanada || sesionAnterior) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = expirada && ultima && !sesionAnterior ? '?error=expirada' : '';
    const salida = esLogin ? NextResponse.next({ request }) : NextResponse.redirect(url);
    [...request.cookies.getAll().map((c) => c.name), COOKIE_ACTIVIDAD]
      .filter((n) => n.startsWith('sb-') || n === COOKIE_ACTIVIDAD)
      .forEach((n) => salida.cookies.set(n, '', { path: '/', maxAge: 0 }));
    return marcar(salida);
  }

  if (!user && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return marcar(NextResponse.redirect(url));
  }
  if (user && esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return marcar(NextResponse.redirect(url));
  }

  if (user) {
    // Cookies de sesión (sin caducidad) + marca de última actividad
    const base = { path: '/', sameSite: 'lax' as const, secure: seguro };
    request.cookies.getAll()
      .filter((c) => c.name.startsWith('sb-'))
      .forEach((c) => response.cookies.set(c.name, c.value, base));
    response.cookies.set(COOKIE_ACTIVIDAD, String(ahora), base);
  }
  return marcar(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.webmanifest|sw.js).*)'],
};
