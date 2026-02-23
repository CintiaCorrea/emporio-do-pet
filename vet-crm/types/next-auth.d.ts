import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string; // Use string em vez de Role
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      image?: string | null;
    } & DefaultSession['user'];
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    image?: string | null;
    error?: string;
  }
}
