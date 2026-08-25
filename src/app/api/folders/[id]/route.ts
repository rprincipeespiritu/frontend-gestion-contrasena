import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSession, requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  const { id } = await params;

  const existing = await prisma.folder.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }

  let body: { nameCipher?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.nameCipher) {
    return NextResponse.json({ error: "Nombre cifrado requerido" }, { status: 400 });
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: { nameCipher: body.nameCipher },
    select: { id: true, nameCipher: true },
  });

  return NextResponse.json({ folder });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  const { id } = await params;

  const existing = await prisma.folder.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }

  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
