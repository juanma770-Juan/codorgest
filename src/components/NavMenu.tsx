"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavMenu() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
        Dashboard
      </Link>
      <Link href="/incubacion" className={`nav-link ${pathname === '/incubacion' ? 'active' : ''}`}>
        Incubación
      </Link>
      <Link href="/jaulas" className={`nav-link ${pathname === '/jaulas' ? 'active' : ''}`}>
        Jaulas
      </Link>
      <Link href="/produccion" className={`nav-link ${pathname === '/produccion' ? 'active' : ''}`}>
        Producción
      </Link>
      <Link href="/alimentacion" className={`nav-link ${pathname === '/alimentacion' ? 'active' : ''}`}>
        Alimentación
      </Link>
      <Link href="/configuracion" className={`nav-link ${pathname === '/configuracion' ? 'active' : ''}`}>
        ⚙️
      </Link>
    </nav>
  );
}
