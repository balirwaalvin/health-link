import { api } from './api';

type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
};

export async function signInWithBackend(email: string, password: string): Promise<{ token: string; user?: AuthUser }> {
  const response = await api.post('/auth/login', {
    email,
    password,
  });

  const token = response.data?.token;
  if (!token) {
    throw new Error('Backend did not return a token');
  }

  return {
    token,
    user: response.data?.user as AuthUser | undefined,
  };
}

export async function signOutFromBackend() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logout is local-first; ignore backend errors.
  }
}