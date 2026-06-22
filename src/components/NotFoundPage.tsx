import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function NotFoundPage(): ReactNode {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-5xl font-bold text-white">404</p>
        <p className="mt-2 text-muted">Esta ruta no existe en la consola.</p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
