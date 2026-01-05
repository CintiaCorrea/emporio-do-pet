// lib/auth.ts - VERSÃO ATUALIZADA
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
          let data: any = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            data = raw;
          }

          if (!response.ok) {
            const message =
              (data &&
                (data.error ||
                  (Array.isArray(data.message) ? data.message.join(", ") : data.message) ||
                  data.message)) ||
              "Credenciais inválidas";
            throw new Error(message);
          }

          // backend retorna: { accessToken, refreshToken, user: { ... } }
          if (!data?.user?.id || !data?.user?.email) return null;

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Tokens do backend (quando login via Nest)
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string | undefined;
        session.refreshToken = token.refreshToken as string | undefined;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/",
    error: "/error",
  },
};
