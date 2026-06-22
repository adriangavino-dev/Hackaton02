import { useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { DEV_CREDENTIALS } from '../lib/env';
import { ApiError } from '../lib/apiClient';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage(): ReactNode {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [teamCode, setTeamCode] = useState(DEV_CREDENTIALS.teamCode);
  const [email, setEmail] = useState(DEV_CREDENTIALS.email);
  const [password, setPassword] = useState(DEV_CREDENTIALS.password);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay sesion, no mostrar el login.
  if (status === 'authenticated') {
    const dest = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(teamCode.trim(), email.trim(), password);
      const dest = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo iniciar sesion. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Tuckersoft</p>
          <h1 className="mt-2 text-2xl font-bold text-white">TropelCare Control Room</h1>
          <p className="mt-1 text-sm text-muted">Pizza Protocol · acceso de operador</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-edge bg-panel p-6 shadow-xl"
        >
          <Field label="Codigo de equipo" htmlFor="teamCode">
            <input
              id="teamCode"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="TEAM-001"
              autoComplete="organization"
              required
              className={inputCls}
            />
          </Field>

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@tuckersoft.com"
              autoComplete="username"
              required
              className={inputCls}
            />
          </Field>

          <Field label="Contrasena" htmlFor="password">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Ingresando...' : 'Encender la consola'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-edge bg-ink px-3 py-2 text-white placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
