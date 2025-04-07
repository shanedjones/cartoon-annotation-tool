# Authentication Recommendations

## Overview
For the cartoon annotation tool, a robust yet straightforward authentication system is recommended.

## Recommended Approach: NextAuth.js

NextAuth.js is ideal for this application because:
- Seamless integration with Next.js
- Support for multiple authentication providers
- Simple API with minimal configuration
- Built-in session management
- TypeScript support

## Implementation Steps

1. Install NextAuth.js:
```bash
npm install next-auth
```

2. Create an API route at `app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";

// In a real app, replace this with your database logic
import { findUserByEmail } from "@/lib/auth"; 

export const authOptions = {
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
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

3. Create required environment variables in `.env.local`:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

4. Create user authentication helpers in `src/lib/auth.ts`:
```typescript
import { hash } from "bcrypt";
import { CosmosClient } from "@azure/cosmos";

// Connect to your Cosmos DB
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const database = client.database("cartoon-db");
const container = database.container("users");

export async function findUserByEmail(email: string) {
  const querySpec = {
    query: "SELECT * FROM c WHERE c.email = @email",
    parameters: [
      {
        name: "@email",
        value: email
      }
    ]
  };
  
  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources[0] || null;
}

export async function createUser(email: string, name: string, password: string) {
  const hashedPassword = await hash(password, 12);
  
  const newUser = {
    id: Date.now().toString(),
    email,
    name,
    hashedPassword,
    createdAt: new Date().toISOString()
  };
  
  const { resource } = await container.items.create(newUser);
  return resource;
}
```

5. Update the SessionContext to work with NextAuth:
```typescript
// src/contexts/SessionContext.tsx
import { createContext, useContext } from "react";
import { useSession, SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Update AppProviders.tsx to include this provider
```

6. Create a sign-in page at `app/auth/signin/page.tsx`:
```typescript
'use client'
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (result.error) {
        setError("Invalid email or password");
        return;
      }
      
      router.push("/");
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  };
  
  return (
    <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

7. Add authentication checks to protected routes:
```typescript
// For client components
'use client'
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/signin");
    },
  });

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return <div>Protected content</div>;
}
```

## Database Integration
Extend the authentication system to store user-specific annotation data in the existing Cosmos DB backend:

1. Associate annotations with user IDs
2. Add permission checks for annotation editing
3. Implement user-specific views in the inbox

## Considerations
- Use dedicated middleware for route protection
- Implement role-based access control if needed
- Install additional dependencies: `npm install bcrypt @types/bcrypt`
- Consider adding user registration functionality