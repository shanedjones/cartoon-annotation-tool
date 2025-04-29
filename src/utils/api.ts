import { NextResponse } from 'next/server';
export function handleRouteError(
  error: unknown,
  context: string,
  customMessage?: string,
  status: number = 500
): NextResponse {
  console.error(`Error in ${context}:`, error);
  const userMessage = customMessage || `Failed to process ${context}`;
  return NextResponse.json(
    { error: userMessage },
    { status }
  );
}
export function handleBadRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}
export function handleNotFound(resource: string): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
}
export function handleConflict(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 409 }
  );
}