// lib/auth.ts - VERSÃO ATUALIZADA
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

function getBackendUrl() {
  const backendBaseUrl =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001";
  const normalized = backendBaseUrl.replace(/\/$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      return { ...token, error: "NoRefreshToken" };
    }

    const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh token:", data);
      return { ...token, error: "RefreshAccessTokenError" };
    }

    return {
      ...token,
      accessToken: data.accessToken,
      accessTokenExpires: Date.now() + 6 * 24 * 60 * 60 * 1000, // 6 days (refresh before 7 day expiry)
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Autenticação delegada ao backend NestJS (evita Prisma no frontend)
          // Esperado: BACKEND_URL=http://localhost:3001  (ou http://localhost:3001/api)
          const backendBaseUrl =
            process.env.BACKEND_URL ||
            process.env.NEXT_PUBLIC_BACKEND_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:3001";

          const normalized = backendBaseUrl.replace(/\/$/, "");
          const endpoint = normalized.endsWith("/api")
            ? `${normalized}/auth/login`
            : `${normalized}/api/auth/login`;

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const raw = await response.text();
          let data: unknown = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }

          if (!response.ok) {
            const errObj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
            const message =
              ((
                errObj &&
                ((typeof errObj.error === 'string' && errObj.error) ||
                  (typeof errObj.message === 'string' && errObj.message) ||
                  (Array.isArray(errObj.message) &&
                    errObj.message.every((x): x is string => typeof x === 'string') &&
                    errObj.message.join(', ')))
              ) || 'Credenciais inválidas');
            throw new Error(message);
          }

          // backend retorna: { accessToken, refreshToken, user: { ... } }
          const obj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
          const user = obj && typeof obj.user === 'object' && obj.user !== null ? (obj.user as Record<string, unknown>) : null;
          const accessToken = obj?.accessToken;
          const refreshToken = obj?.refreshToken;

          const id = user?.id;
          const email = user?.email;

          if (typeof id !== 'string' || typeof email !== 'string') return null;

          return {
            id,
            email,
            name: typeof user?.name === 'string' ? user.name : null,
            image: typeof user?.image === 'string' ? user.image : null,
            role: typeof user?.role === 'string' ? user.role : undefined,
            accessToken: typeof accessToken === 'string' ? accessToken : undefined,
            refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
          };
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  
  secret: process.env.NEXTAUTH_SECRET,
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.image = user.image;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        // Tokens do backend (quando login via Nest)
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        // Set token expiration (6 days to refresh before 7 day backend expiry)
        token.accessTokenExpires = Date.now() + 6 * 24 * 60 * 60 * 1000;
      }

      // Permite atualizar session fields via useSession().update()
      if (trigger === 'update' && session) {
        const s = session as unknown;
        const sObj = typeof s === 'object' && s !== null ? (s as Record<string, unknown>) : null;
        const sUser =
          sObj && typeof sObj.user === 'object' && sObj.user !== null ? (sObj.user as Record<string, unknown>) : null;

        const name =
          (typeof sObj?.name === 'string' ? sObj.name : undefined) ??
          (typeof sUser?.name === 'string' ? sUser.name : undefined);
        const email =
          (typeof sObj?.email === 'string' ? sObj.email : undefined) ??
          (typeof sUser?.email === 'string' ? sUser.email : undefined);
        const image =
          (typeof sObj?.image === 'string' ? sObj.image : undefined) ??
          (typeof sUser?.image === 'string' ? sUser.image : undefined);

        if (name) token.name = name;
        if (email) token.email = email;
        if (image) token.image = image;
      }

      // Return previous token if it hasn't expired yet
      const expires = token.accessTokenExpires as number | undefined;
      if (expires && Date.now() < expires) {
        return token;
      }

      // Access token has expired, try to refresh
      if (token.refreshToken) {
        return refreshAccessToken(token);
      }

      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.image = (token.image as string | null | undefined) ?? undefined;
        session.accessToken = token.accessToken as string | undefined;
        session.refreshToken = token.refreshToken as string | undefined;
      }
      // Expose error to client so it can handle re-login
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/",
    error: "/error",
  },
};
