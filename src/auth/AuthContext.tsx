import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearToken, getToken, setToken } from '../lib/apiClient';
import { fetchMe, login as loginRequest } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface AuthState {
  user: AuthUser | null;
  // 'restoring' mientras validamos un token guardado al cargar la app.
  status: 'restoring' | 'authenticated' | 'unauthenticated';
}

interface AuthContextValue extends AuthState {
  login: (teamCode: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: getToken() ? 'restoring' : 'unauthenticated',
  });
  const didRestore = useRef(false);

  // Restauracion de sesion al cargar/recargar: si hay token, validar con /auth/me.
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    if (!getToken()) {
      setState({ user: null, status: 'unauthenticated' });
      return;
    }
    const controller = new AbortController();
    fetchMe(controller.signal)
      .then((user) => setState({ user, status: 'authenticated' }))
      .catch(() => {
        clearToken();
        setState({ user: null, status: 'unauthenticated' });
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(
    async (teamCode: string, email: string, password: string) => {
      const res = await loginRequest(teamCode, email, password);
      setToken(res.token);
      setState({ user: res.user, status: 'authenticated' });
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
