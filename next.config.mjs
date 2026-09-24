import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
// Cabeceras de seguridad: impiden incrustar el sitio en otras páginas, el "olfateo" de tipos y filtran el referer.
const cabeceras = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  poweredByHeader: false,
  // La sección de vencimientos se reemplazó por el control de operaciones.
  async redirects() {
    return [{ source: '/vencimientos', destination: '/operaciones', permanent: true }];
  },
  async headers() {
    return [{ source: '/:path*', headers: cabeceras }];
  },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(raiz, 'src');
    return config;
  },
};
export default nextConfig;
