import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const folders = await prisma.folder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, nameCipher: true },
  });

  return NextResponse.json({ folders });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!isSession(session)) return session;

  let body: { nameCipher?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.nameCipher) {
    return NextResponse.json({ error: "Nombre cifrado requerido" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { userId: session.userId, nameCipher: body.nameCipher },
    select: { id: true, nameCipher: true },
  });

  return NextResponse.json({ folder });
}
