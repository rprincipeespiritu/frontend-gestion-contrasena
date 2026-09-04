"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, setToken } from "@/lib/api";
import { getLockMinutes, lockMs } from "@/lib/autolock";
import { decryptJson, encryptJson } from "@/lib/crypto";
import type {
  EncryptedFolder,
  EncryptedItem,
  FolderDecrypted,
  ItemData,
  ItemType,
  DocumentData,
  UnlockPayload,
  VaultItemDecrypted,
} from "@/lib/types";
import { isItemType } from "@/lib/types";
import { deleteVaultFile } from "@/lib/vault-file";
import { FREE_PLAN, type PlanStatus } from "@/lib/plan";

type VaultContextValue = {
  email: string;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  subscription: PlanStatus;
  setSubscription: (value: PlanStatus) => void;
  locked: boolean;
  busy: boolean;
  error: string | null;
  items: VaultItemDecrypted[];
  trashItems: VaultItemDecrypted[];
  folders: FolderDecrypted[];
  search: string;
  setSearch: (value: string) => void;
  unlockWithKey: (key: CryptoKey) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  lock: () => void;
  logout: () => Promise<void>;
  getVaultKey: () => CryptoKey | null;
  createItem: (input: {
    type: ItemType;
    folderId: string | null;
    favorite: boolean;
    data: ItemData;
  }) => Promise<string>;
  updateItem: (
    id: string,
    input: {
      type?: ItemType;
      folderId?: string | null;
      favorite?: boolean;
      data?: ItemData;
    },
  ) => Promise<void>;
  trashItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  destroyItem: (id: string) => Promise<void>;
  touchItem: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
};

const VaultContext = createContext<VaultContextValue | null>(null);

let memoryKey: CryptoKey | null = null;

export function rememberVaultKey(key: CryptoKey | null) {
  memoryKey = key;
}

function toDecrypted(item: EncryptedItem, data: ItemData): VaultItemDecrypted {
  return {
    id: item.id,
    type: item.type,
    favorite: item.favorite,
    folderId: item.folderId,
    data,
    lastUsedAt: item.lastUsedAt,
    deletedAt: item.deletedAt,
    updatedAt: item.updatedAt,
  };
}

async function decryptItems(items: EncryptedItem[], key: CryptoKey) {
  const result: VaultItemDecrypted[] = [];
  for (const item of items) {
    if (!isItemType(item.type)) continue;
    try {
      const data = await decryptJson<ItemData>(item.cipherBlob, key);
      result.push(toDecrypted(item, data));
    } catch {
      // Skip items that cannot be decrypted with the current key.
    }
  }
  return result;
}

async function decryptFolders(folders: EncryptedFolder[], key: CryptoKey) {
  const result: FolderDecrypted[] = [];
  for (const folder of folders) {
    try {
      const name = await decryptJson<string>(folder.nameCipher, key);
      result.push({ id: folder.id, name });
    } catch {
      result.push({ id: folder.id, name: "Carpeta" });
    }
  }
  return result;
}

export function VaultProvider({
  email,
  initialAvatarUrl = null,
  initialSubscription = FREE_PLAN,
  children,
}: {
  email: string;
  initialAvatarUrl?: string | null;
  initialSubscription?: PlanStatus;
  children: React.ReactNode;
}) {
  const keyRef = useRef<CryptoKey | null>(memoryKey);
  const [locked, setLocked] = useState(!memoryKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [subscription, setSubscription] = useState<PlanStatus>(initialSubscription);
  const [items, setItems] = useState<VaultItemDecrypted[]>([]);
  const [trashItems, setTrashItems] = useState<VaultItemDecrypted[]>([]);
  const [folders, setFolders] = useState<FolderDecrypted[]>([]);
  const [search, setSearch] = useState("");
  const [lockVersion, setLockVersion] = useState(0);

  const loadVault = useCallback(async (key: CryptoKey) => {
    const [itemRes, trashRes, folderRes] = await Promise.all([
      api<{ items: EncryptedItem[] }>("/api/items"),
      api<{ items: EncryptedItem[] }>("/api/items?trash=1"),
      api<{ folders: EncryptedFolder[] }>("/api/folders"),
    ]);
    const [nextItems, nextTrash, nextFolders] = await Promise.all([
      decryptItems(itemRes.items, key),
      decryptItems(trashRes.items, key),
      decryptFolders(folderRes.folders, key),
    ]);
    setItems(nextItems);
    setTrashItems(nextTrash);
    setFolders(nextFolders);
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    rememberVaultKey(null);
    setItems([]);
    setTrashItems([]);
    setFolders([]);
    setLocked(true);
  }, []);

  const unlockWithKey = useCallback(
    async (key: CryptoKey) => {
      keyRef.current = key;
      rememberVaultKey(key);
      await loadVault(key);
      setLocked(false);
      setError(null);
    },
    [loadVault],
  );

  const unlockWithPassword = useCallback(
    async (password: string) => {
      setBusy(true);
      setError(null);
      try {
        const payload = await api<UnlockPayload>("/api/auth/me");
        const { unprotectVaultKey, deriveMasterMaterial, masterKeyFromMaterial } =
          await import("@/lib/crypto");
        const material = await deriveMasterMaterial(
          password,
          payload.kdfSalt,
          payload.kdfIterations,
        );
        const masterKey = await masterKeyFromMaterial(material);
        const vaultKey = await unprotectVaultKey(payload.protectedVaultKey, masterKey);
        await unlockWithKey(vaultKey);
      } catch {
        setError("No se pudo desbloquear. Revisa la contraseña maestra.");
        throw new Error("unlock-failed");
      } finally {
        setBusy(false);
      }
    },
    [unlockWithKey],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
      lock();
      window.location.href = "/login";
    }
  }, [lock]);

  const getVaultKey = useCallback(() => keyRef.current, []);

  const createItem = useCallback(
    async (input: {
      type: ItemType;
      folderId: string | null;
      favorite: boolean;
      data: ItemData;
    }) => {
      const key = keyRef.current;
      if (!key) throw new Error("Bóveda bloqueada");
      const cipherBlob = await encryptJson(input.data, key);
      const res = await api<{ item: EncryptedItem }>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          type: input.type,
          folderId: input.folderId,
          favorite: input.favorite,
          cipherBlob,
        }),
      });
      const [decrypted] = await decryptItems([res.item], key);
      if (decrypted) setItems((prev) => [decrypted, ...prev]);
      return res.item.id;
    },
    [],
  );

  const updateItem = useCallback(
    async (
      id: string,
      input: {
        type?: ItemType;
        folderId?: string | null;
        favorite?: boolean;
        data?: ItemData;
      },
    ) => {
      const key = keyRef.current;
      if (!key) throw new Error("Bóveda bloqueada");
      const cipherBlob = input.data ? await encryptJson(input.data, key) : undefined;
      const res = await api<{ item: EncryptedItem }>(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          type: input.type,
          folderId: input.folderId,
          favorite: input.favorite,
          cipherBlob,
        }),
      });
      const [decrypted] = await decryptItems([res.item], key);
      if (decrypted) {
        setItems((prev) => prev.map((item) => (item.id === id ? decrypted : item)));
      }
    },
    [],
  );

  const trashItem = useCallback(async (id: string) => {
    const res = await api<{ item: EncryptedItem }>(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => {
      const found = prev.find((item) => item.id === id);
      if (found && res.item) {
        setTrashItems((trash) => [{ ...found, deletedAt: res.item.deletedAt }, ...trash]);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const restoreItem = useCallback(async (id: string) => {
    const key = keyRef.current;
    if (!key) throw new Error("Bóveda bloqueada");
    const res = await api<{ item: EncryptedItem }>(`/api/items/${id}/restore`, { method: "POST" });
    const [decrypted] = await decryptItems([res.item], key);
    setTrashItems((prev) => prev.filter((item) => item.id !== id));
    if (decrypted) setItems((prev) => [decrypted, ...prev]);
  }, []);

  const destroyItem = useCallback(async (id: string) => {
    const found =
      trashItems.find((item) => item.id === id) ?? items.find((item) => item.id === id);
    if (found?.type === "document") {
      const fileKey = (found.data as DocumentData).fileKey;
      if (fileKey) await deleteVaultFile(fileKey).catch(() => undefined);
    }
    await api(`/api/items/${id}?permanent=1`, { method: "DELETE" });
    setTrashItems((prev) => prev.filter((item) => item.id !== id));
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [items, trashItems]);

  const touchItem = useCallback(async (id: string) => {
    const key = keyRef.current;
    if (!key) return;
    const res = await api<{ item: EncryptedItem }>(`/api/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ touch: true }),
    });
    const [decrypted] = await decryptItems([res.item], key);
    if (decrypted) {
      setItems((prev) => prev.map((item) => (item.id === id ? decrypted : item)));
    }
  }, []);

  const createFolder = useCallback(async (name: string) => {
    const key = keyRef.current;
    if (!key) throw new Error("Bóveda bloqueada");
    const nameCipher = await encryptJson(name, key);
    const res = await api<{ folder: EncryptedFolder }>("/api/folders", {
      method: "POST",
      body: JSON.stringify({ nameCipher }),
    });
    const [folder] = await decryptFolders([res.folder], key);
    if (folder) setFolders((prev) => [...prev, folder]);
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await api(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
    setItems((prev) =>
      prev.map((item) => (item.folderId === id ? { ...item, folderId: null } : item)),
    );
  }, []);

  useEffect(() => {
    if (memoryKey) void unlockWithKey(memoryKey);
  }, [unlockWithKey]);

  useEffect(() => {
    if (locked) return;
    const ms = lockMs();
    if (ms <= 0) return;
    let timer = window.setTimeout(lock, ms);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, lockMs() || ms);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [locked, lock, lockVersion]);

  useEffect(() => {
    const onStorage = () => setLockVersion((v) => v + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      email,
      avatarUrl,
      setAvatarUrl,
      subscription,
      setSubscription,
      locked,
      busy,
      error,
      items,
      trashItems,
      folders,
      search,
      setSearch,
      unlockWithKey,
      unlockWithPassword,
      lock,
      logout,
      getVaultKey,
      createItem,
      updateItem,
      trashItem,
      restoreItem,
      destroyItem,
      touchItem,
      createFolder,
      deleteFolder,
    }),
    [
      email,
      avatarUrl,
      subscription,
      locked,
      busy,
      error,
      items,
      trashItems,
      folders,
      search,
      unlockWithKey,
      unlockWithPassword,
      lock,
      logout,
      getVaultKey,
      createItem,
      updateItem,
      trashItem,
      restoreItem,
      destroyItem,
      touchItem,
      createFolder,
      deleteFolder,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault debe usarse dentro de VaultProvider");
  return ctx;
}
