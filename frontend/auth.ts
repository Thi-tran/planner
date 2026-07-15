import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens received from Google
      if (account) {
        return {
          ...token,
          id_token: account.id_token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        };
      }

      // Token not yet expired (60-second buffer)
      const expiresAt = token.expires_at as number | undefined;
      if (expiresAt && Date.now() < expiresAt * 1000 - 60_000) {
        return token;
      }

      // Attempt silent refresh via offline access
      const refreshToken = token.refresh_token as string | undefined;
      if (!refreshToken) {
        return { ...token, error: 'RefreshTokenError' };
      }

      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          return { ...token, error: 'RefreshTokenError' };
        }

        const refreshed = (await response.json()) as {
          id_token?: string;
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };

        return {
          ...token,
          id_token: refreshed.id_token ?? token.id_token,
          access_token: refreshed.access_token ?? token.access_token,
          // Google only returns a new refresh_token on first consent — preserve the original
          refresh_token: refreshed.refresh_token ?? token.refresh_token,
          expires_at: refreshed.expires_in
            ? Math.floor(Date.now() / 1000) + refreshed.expires_in
            : token.expires_at,
          error: undefined,
        };
      } catch {
        return { ...token, error: 'RefreshTokenError' };
      }
    },

    async session({ session, token }) {
      // Expose the error flag so the client can force re-login.
      // id_token stays server-side only — NOT exposed to the browser via session.
      if (token.error) {
        (session as unknown as Record<string, unknown>).error = token.error;
      }
      return session;
    },
  },
});
