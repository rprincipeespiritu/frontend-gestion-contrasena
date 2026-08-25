async function sha1Hex(value: string) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function pwnedCount(password: string): Promise<number> {
  if (!password) return 0;
  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  if (!res.ok) throw new Error("No se pudo consultar el registro de filtraciones");
  const body = await res.text();
  const line = body.split("\n").find((row) => row.startsWith(suffix));
  if (!line) return 0;
  return Number(line.trim().split(":")[1] ?? 0);
}
