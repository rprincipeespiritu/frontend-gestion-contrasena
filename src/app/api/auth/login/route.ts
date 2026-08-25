import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: { email?: string; authHash?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const authHash = body.authHash ?? "";
  if (!email || !authHash) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const ok = await bcrypt.compare(authHash, user.authHash);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  await createSession(user.id, user.email);

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    kdfSalt: user.kdfSalt,
    kdfIterations: user.kdfIterations,
    protectedVaultKey: user.protectedVaultKey,
  });
}
