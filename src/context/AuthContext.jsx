import { createContext, useContext, useState, useCallback } from 'react';
import { GENESYS_CONFIG } from '../config/genesys.js';
import { generatePKCE } from '../services/pkce.js';
import { getMe, disassociateStation } from '../services/genesysApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token,   setToken]   = useState(() => localStorage.getItem('ag_token') || null);
  const [user,    setUser]    = useState(() => {
    const raw = localStorage.getItem('ag_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async () => {
    const { verifier, challenge } = await generatePKCE();
    localStorage.setItem('pkce_verifier', verifier);

    const params = new URLSearchParams({
      response_type:         'code',
      client_id:             GENESYS_CONFIG.clientId,
      redirect_uri:          GENESYS_CONFIG.redirectUri,
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      scope:                 GENESYS_CONFIG.scopes,
    });

    window.location.href = `${GENESYS_CONFIG.authUrl}?${params}`;
  }, []);

  const saveSession = useCallback(async (accessToken) => {
    setLoading(true);
    try {
      localStorage.setItem('ag_token', accessToken);
      setToken(accessToken);

      const me = await getMe(accessToken);
      localStorage.setItem('ag_user', JSON.stringify(me));
      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (token && user) {
      try {
        await disassociateStation(token, user.id);
      } catch {
        // non-fatal
      }
    }
    localStorage.removeItem('ag_token');
    localStorage.removeItem('ag_user');
    setToken(null);
    setUser(null);
  }, [token, user]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, saveSession, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
