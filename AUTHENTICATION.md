# Authentication Implementation

## Overview
A complete username/password authentication system has been implemented for the Cartoon Annotation Tool using NextAuth.js. This document outlines what was implemented and provides instructions for setup and testing.

## Implemented Features

1. **User Authentication**
   - Username/password login with secure password hashing via bcrypt
   - Session management with JWT tokens
   - Protected routes with middleware

2. **Core Authentication Components**
   - NextAuth.js API route for authentication
   - User management in Cosmos DB
   - Login and registration pages
   - Context providers for authentication state

3. **Protection and Authorization**
   - Middleware to protect routes
   - Auth context for managing user state
   - Custom hooks for requiring authentication

## File Structure

- `app/api/auth/[...nextauth]/route.ts` - NextAuth.js configuration
- `app/api/auth/register/route.ts` - API route for user registration
- `app/auth/signin/page.tsx` - Login page
- `app/auth/register/page.tsx` - Registration page
- `src/contexts/AuthContext.tsx` - Authentication context provider
- `src/lib/auth.ts` - Authentication utility functions
- `middleware.ts` - Route protection middleware
- `scripts/seed-users.js` - Script to seed initial admin user

## Setup Instructions

1. **Environment Variables**
   
   A `.env.local` file has been created with the following variables:
   ```
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_random_secret_replace_this_in_production
   ```

   For production, replace the NEXTAUTH_SECRET with a secure random string.

2. **Database Setup**

   Run the following command to create an initial admin user:
   ```
   npm run seed-users
   ```

   This creates a user with:
   - Email: admin@example.com
   - Password: password123

   **Important:** Change these credentials in production!

3. **Access Protected Routes**

   After signing in, you'll be able to access protected routes like:
   - The homepage (/)
   - Inbox (/inbox)

## Testing the Authentication

1. **Start the Development Server**
   ```
   npm run dev
   ```

2. **Access the Application**
   - Navigate to http://localhost:3000
   - You should be redirected to the login page

3. **Login with Admin Credentials**
   - Email: admin@example.com
   - Password: password123
   - After login, you will be redirected to the inbox page

4. **Register a New User**
   - Navigate to http://localhost:3000/auth/register
   - Fill in the registration form to create a new user

## Customization

- **Session Duration**: You can customize the session duration in `app/api/auth/[...nextauth]/route.ts`
- **Protected Routes**: Edit the public routes list in `middleware.ts` to change which routes are accessible without authentication

## Security Considerations

- The NEXTAUTH_SECRET should be a strong, random value in production
- Password hashing is handled by bcrypt with a cost factor of 12
- User input is validated on both client and server sides
- JWT tokens are used for session management

---

For any issues or questions, check the [NextAuth.js documentation](https://next-auth.js.org/getting-started/introduction) for more details.