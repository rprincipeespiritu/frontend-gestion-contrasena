export const ITEM_TYPES = [
  "login",
  "passkey",
  "note",
  "card",
  "contact",
  "document",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type LoginData = {
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export type PasskeyData = {
  name: string;
  username: string;
  site: string;
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

export type ContactData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export type DocumentData = {
  name: string;
  fileName: string;
  mimeType: string;
  content: string;
  fileKey?: string;
  size?: number;
  notes: string;
};

export type ItemData =
  | LoginData
  | PasskeyData
  | NoteData
  | CardData
  | ContactData
  | DocumentData;

export type EncryptedItem = {
  id: string;
  type: ItemType;
  favorite: boolean;
  folderId: string | null;
  cipherBlob: string;
  lastUsedAt: string | null;
  deletedAt: string | null;
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
  lastUsedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type FolderDecrypted = {
  id: string;
  name: string;
};

import type { PlanStatus } from "./plan";

export type UnlockPayload = {
  token?: string;
  user: { id: string; email: string; avatarUrl?: string | null };
  kdfSalt: string;
  kdfIterations: number;
  protectedVaultKey: string;
  hasRecovery?: boolean;
  recoveryBlob?: string | null;
  recoverySalt?: string | null;
  recoveryIterations?: number | null;
  subscription?: PlanStatus;
};

export function isItemType(value: string): value is ItemType {
  return ITEM_TYPES.includes(value as ItemType);
}

export const TYPE_LABEL: Record<ItemType, string> = {
  login: "Contraseña",
  passkey: "Passkey",
  note: "Nota segura",
  card: "Tarjeta",
  contact: "Contacto",
  document: "Documento",
};

export function emptyData(type: ItemType): ItemData {
  if (type === "login") return { name: "", username: "", password: "", url: "", notes: "" };
  if (type === "passkey") return { name: "", username: "", site: "", notes: "" };
  if (type === "note") return { title: "", content: "" };
  if (type === "card") return { name: "", holder: "", number: "", expiry: "", cvv: "", notes: "" };
  if (type === "contact") return { name: "", email: "", phone: "", address: "", notes: "" };
  return { name: "", fileName: "", mimeType: "", content: "", fileKey: "", size: 0, notes: "" };
}

export function itemTitle(item: VaultItemDecrypted): string {
  if (item.type === "login") return (item.data as LoginData).name || "Contraseña";
  if (item.type === "passkey") return (item.data as PasskeyData).name || "Passkey";
  if (item.type === "note") return (item.data as NoteData).title || "Nota segura";
  if (item.type === "card") return (item.data as CardData).name || "Tarjeta";
  if (item.type === "contact") return (item.data as ContactData).name || "Contacto";
  return (item.data as DocumentData).name || (item.data as DocumentData).fileName || "Documento";
}

export function itemSubtitle(item: VaultItemDecrypted): string {
  if (item.type === "login") {
    const data = item.data as LoginData;
    return data.username || data.url || "Sin usuario";
  }
  if (item.type === "passkey") {
    const data = item.data as PasskeyData;
    return data.username || data.site || "Passkey";
  }
  if (item.type === "note") {
    const content = (item.data as NoteData).content.trim();
    return content ? content.slice(0, 80) : "Nota segura";
  }
  if (item.type === "card") {
    const data = item.data as CardData;
    const digits = data.number.replace(/\s/g, "");
    if (digits.length >= 4) return `•••• ${digits.slice(-4)}`;
    return data.holder || "Tarjeta";
  }
  if (item.type === "contact") {
    const data = item.data as ContactData;
    return data.email || data.phone || "Contacto";
  }
  const data = item.data as DocumentData;
  return data.fileName || "Sin archivo adjunto";
}

export function itemMatchesQuery(item: VaultItemDecrypted, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [itemTitle(item), itemSubtitle(item), JSON.stringify(item.data)]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
