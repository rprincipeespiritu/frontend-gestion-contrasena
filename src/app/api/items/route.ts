import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isItemType } from "@/lib/types";
import { isSession, requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession();
  if (!isSession(session)) return session;

  const items = await prisma.vaultItem.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
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
    items: items.map((item) => ({
      ...item,
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!isSession(session)) return session;

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

  if (!body.type || !isItemType(body.type) || !body.cipherBlob) {
    return NextResponse.json({ error: "Datos de ítem no válidos" }, { status: 400 });
  }

  if (body.folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: body.folderId, userId: session.userId },
    });
    if (!folder) {
      return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 400 });
    }
  }

  const item = await prisma.vaultItem.create({
    data: {
      userId: session.userId,
      type: body.type,
      folderId: body.folderId ?? null,
      favorite: Boolean(body.favorite),
      cipherBlob: body.cipherBlob,
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
