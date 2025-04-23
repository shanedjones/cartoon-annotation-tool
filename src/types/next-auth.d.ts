import "next-auth";
// JWT is used in module declaration - eslint doesn't recognize this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's unique identifier */
      id: string;
      /** The user's name */
      name?: string | null;
      /** The user's email address */
      email?: string | null;
      /** The user's profile image */
      image?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string;
    name?: string | null;
    picture?: string | null;
  }
}