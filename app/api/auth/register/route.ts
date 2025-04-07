import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/src/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const user = await createUser(email, name, password);

    // Return success response without sensitive data
    return NextResponse.json(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        message: "User registered successfully" 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
