import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Spinner, StatePanel } from '../components/states';

// Protege rutas privadas. Mientras restauramos la sesion mostramos un loader
// para evitar parpadeos hacia /login en recargas con token valido.
export function ProtectedRoute({ children }: { children: ReactNode }): ReactNode {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return (
      <div className="grid min-h-screen place-items-center">
        <StatePanel>
          <Spinner label="Restaurando sesion..." />
        </StatePanel>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
