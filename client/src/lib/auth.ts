import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },

  providers: [
    // ── Google ────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email + Password ──────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { rows } = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [credentials.email.toLowerCase()]
        );

        const user = rows[0];

        if (!user) {
          throw new Error("No account found with this email.");
        }

        if (!user.password_hash) {
          throw new Error("GOOGLE_ACCOUNT_NO_PASSWORD");
        }

        if (!user.email_verified) {
          throw new Error("Please verify your email before logging in.");
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!valid) {
          throw new Error("Incorrect password.");
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await pool.query(
            `INSERT INTO users (name, email, password_hash, email_verified, provider)
             VALUES ($1, $2, NULL, TRUE, 'google')
             ON CONFLICT (email) DO UPDATE SET
               name = EXCLUDED.name,
               email_verified = TRUE,
               provider = CASE
                 WHEN users.password_hash IS NOT NULL THEN 'both'
                 ELSE 'google'
               END`,
            [user.name, user.email?.toLowerCase()]
          );
        } catch (err) {
          console.error("[signIn:google] DB error:", err);
          return false;
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
      }
      return session;
    },
  },
};