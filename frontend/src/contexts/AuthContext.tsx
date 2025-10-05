import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { User, AuthTokens, AuthState } from '../types';
import { authService } from '../services/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        tokens: action.payload.tokens,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        tokens: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        tokens: null,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const tokens = localStorage.getItem('authTokens');
      const user = localStorage.getItem('user');

      if (tokens && user) {
        try {
          // Verify token is still valid
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            dispatch({
              type: 'SET_USER',
              payload: JSON.parse(user),
            });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('authTokens');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem('authTokens');
          localStorage.removeItem('user');
        }
      }

      dispatch({ type: 'AUTH_FAILURE' });
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.login(email, password);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const register = async (email: string, password: string, role?: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authService.register(email, password, role);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        localStorage.setItem('user', JSON.stringify(user));
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    }
    
    // Clear localStorage
    localStorage.removeItem('authTokens');
    localStorage.removeItem('user');
    
    dispatch({ type: 'LOGOUT' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};