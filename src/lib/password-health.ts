import type { LoginData, VaultItemDecrypted } from "@/lib/types";

export type HealthIssue = {
  id: string;
  title: string;
  reason: "weak" | "reused" | "old";
};

function scorePassword(password: string) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function analyzePasswordHealth(items: VaultItemDecrypted[]): HealthIssue[] {
  const logins = items.filter((item) => item.type === "login" && !item.deletedAt);
  const byPassword = new Map<string, string[]>();
  const issues: HealthIssue[] = [];

  for (const item of logins) {
    const data = item.data as LoginData;
    const password = data.password;
    if (!password) {
      issues.push({ id: item.id, title: data.name || "Contraseña", reason: "weak" });
      continue;
    }
    if (scorePassword(password) < 3) {
      issues.push({ id: item.id, title: data.name || "Contraseña", reason: "weak" });
    }
    const age = Date.now() - new Date(item.updatedAt).getTime();
    if (age > 1000 * 60 * 60 * 24 * 180) {
      issues.push({ id: item.id, title: data.name || "Contraseña", reason: "old" });
    }
    const list = byPassword.get(password) ?? [];
    list.push(item.id);
    byPassword.set(password, list);
  }

  for (const ids of byPassword.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      const item = logins.find((entry) => entry.id === id);
      if (!item) continue;
      issues.push({
        id,
        title: (item.data as LoginData).name || "Contraseña",
        reason: "reused",
      });
    }
  }

  return issues;
}
