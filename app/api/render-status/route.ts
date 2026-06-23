import { NextResponse } from "next/server";

export async function GET() {
  const configured = Boolean(
    process.env.CONVERTAPI_SECRET ?? process.env.CONVERTAPI_TOKEN,
  );
  return NextResponse.json({
    configured,
    backend: configured ? "convertapi" : "html-fallback",
  });
}
