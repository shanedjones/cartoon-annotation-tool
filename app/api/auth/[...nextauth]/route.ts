import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import { User } from "next-auth";

// Import auth helpers
import { findUserByEmail } from "@/src/lib/auth";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await findUserByEmail(credentials.email);
        if (!user) {
          return null;
        }
        
        const isPasswordValid = await compare(
          credentials.password,
          user.hashedPassword
        );
        
        if (!isPasswordValid) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session, token: JWT }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT, user: User | undefined }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
