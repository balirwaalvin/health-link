import { ClerkProvider } from '@clerk/clerk-react';

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const clerkConfig = {
  publishableKey: requireEnv(
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ),
};

export { ClerkProvider };

export function getAuthToken(): string | null {
  // Get token from Clerk - in real implementation, use useAuth hook
  // For now, return from sessionStorage if available
  return sessionStorage.getItem('clerk_token') || null;
}
