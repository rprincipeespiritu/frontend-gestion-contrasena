import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isItemType } from "@/lib/types";
import { isSession, requireSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  const { id } = await params;

  const existing = await prisma.vaultItem.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  let body: {
    type?: string;
    folderId?: string | null;
    favorite?: boolean;
    cipherBlob?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.type && !isItemType(body.type)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  if (body.folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: body.folderId, userId: session.userId },
    });
    if (!folder) {
      return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 400 });
    }
  }

  const item = await prisma.vaultItem.update({
    where: { id },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(body.cipherBlob ? { cipherBlob: body.cipherBlob } : {}),
      ...(typeof body.favorite === "boolean" ? { favorite: body.favorite } : {}),
      ...(body.folderId !== undefined ? { folderId: body.folderId } : {}),
    },
    select: {
      id: true,
      type: true,
      favorite: true,
      folderId: true,
      cipherBlob: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    item: { ...item, updatedAt: item.updatedAt.toISOString() },
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await requireSession();
  if (!isSession(session)) return session;
  const { id } = await params;

  const existing = await prisma.vaultItem.findFirst({
    where: { id, userId: session.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
  }

  await prisma.vaultItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
