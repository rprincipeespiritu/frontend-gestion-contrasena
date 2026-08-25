import { redirect } from "next/navigation";
import { VaultProvider } from "@/components/vault-provider";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <VaultProvider email={session.email}>
      <div className="flex min-h-full flex-1 flex-col">{children}</div>
    </VaultProvider>
  );
}
