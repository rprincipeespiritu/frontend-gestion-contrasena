import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: {
    email?: string;
    authHash?: string;
    kdfSalt?: string;
    kdfIterations?: number;
    protectedVaultKey?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const authHash = body.authHash ?? "";
  const kdfSalt = body.kdfSalt ?? "";
  const kdfIterations = body.kdfIterations ?? 0;
  const protectedVaultKey = body.protectedVaultKey ?? "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }
  if (!authHash || !kdfSalt || !protectedVaultKey) {
    return NextResponse.json({ error: "Faltan datos de cifrado" }, { status: 400 });
  }
  if (kdfIterations < 100_000 || kdfIterations > 1_000_000) {
    return NextResponse.json({ error: "Iteraciones KDF no válidas" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(authHash, 12);
  const user = await prisma.user.create({
    data: {
      email,
      authHash: hashed,
      kdfSalt,
      kdfIterations,
      protectedVaultKey,
    },
  });

  await createSession(user.id, user.email);

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    kdfSalt: user.kdfSalt,
    kdfIterations: user.kdfIterations,
    protectedVaultKey: user.protectedVaultKey,
  });
}
