import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/src/lib/auth";
import { handleRouteError, handleBadRequest, handleConflict } from "@/src/utils/api";
export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();
    if (!email || !name || !password) {
      return handleBadRequest("Missing required fields");
    }
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return handleConflict("User with this email already exists");
    }
    const user = await createUser(email, name, password);
    if (!user) {
      return handleRouteError(
        new Error("User creation failed"),
        "user registration",
        "Failed to create user"
      );
    }
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
    return handleRouteError(error, "user registration", "An error occurred during registration");
  }
}
