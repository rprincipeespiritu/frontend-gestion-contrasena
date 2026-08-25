export const ITEM_TYPES = ["login", "note", "card"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type LoginData = {
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export type NoteData = {
  title: string;
  content: string;
};

export type CardData = {
  name: string;
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
  notes: string;
};

export type ItemData = LoginData | NoteData | CardData;

export type EncryptedItem = {
  id: string;
  type: ItemType;
  favorite: boolean;
  folderId: string | null;
  cipherBlob: string;
  updatedAt: string;
};

export type EncryptedFolder = {
  id: string;
  nameCipher: string;
};

export type VaultItemDecrypted = {
  id: string;
  type: ItemType;
  favorite: boolean;
  folderId: string | null;
  data: ItemData;
  updatedAt: string;
};

export type FolderDecrypted = {
  id: string;
  name: string;
};

export type UnlockPayload = {
  user: { id: string; email: string };
  kdfSalt: string;
  kdfIterations: number;
  protectedVaultKey: string;
};

export function isItemType(value: string): value is ItemType {
  return ITEM_TYPES.includes(value as ItemType);
}

export function emptyData(type: ItemType): ItemData {
  if (type === "login") {
    return { name: "", username: "", password: "", url: "", notes: "" };
  }
  if (type === "note") {
    return { title: "", content: "" };
  }
  return { name: "", holder: "", number: "", expiry: "", cvv: "", notes: "" };
}

export function itemTitle(item: VaultItemDecrypted): string {
  if (item.type === "login") return (item.data as LoginData).name || "Inicio de sesión";
  if (item.type === "note") return (item.data as NoteData).title || "Nota segura";
  return (item.data as CardData).name || "Tarjeta";
}

export function itemSubtitle(item: VaultItemDecrypted): string {
  if (item.type === "login") {
    const data = item.data as LoginData;
    return data.username || data.url || "Sin usuario";
  }
  if (item.type === "note") {
    const content = (item.data as NoteData).content.trim();
    return content ? content.slice(0, 80) : "Nota segura";
  }
  const data = item.data as CardData;
  const digits = data.number.replace(/\s/g, "");
  if (digits.length >= 4) return `•••• ${digits.slice(-4)}`;
  return data.holder || "Tarjeta";
}

export function itemMatchesQuery(item: VaultItemDecrypted, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [itemTitle(item), itemSubtitle(item)];
  if (item.type === "login") {
    const data = item.data as LoginData;
    haystack.push(data.url, data.notes, data.username);
  } else if (item.type === "note") {
    haystack.push((item.data as NoteData).content);
  } else {
    const data = item.data as CardData;
    haystack.push(data.holder, data.notes);
  }
  return haystack.join(" ").toLowerCase().includes(q);
}
