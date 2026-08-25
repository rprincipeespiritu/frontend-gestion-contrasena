import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      kdfSalt: true,
      kdfIterations: true,
      protectedVaultKey: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    kdfSalt: user.kdfSalt,
    kdfIterations: user.kdfIterations,
    protectedVaultKey: user.protectedVaultKey,
  });
}
