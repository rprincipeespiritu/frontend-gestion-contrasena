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
import { api } from "@/lib/api";
import { decryptJson, encryptJson } from "@/lib/crypto";
import type {
  EncryptedFolder,
  EncryptedItem,
  FolderDecrypted,
  ItemData,
  ItemType,
  UnlockPayload,
  VaultItemDecrypted,
} from "@/lib/types";
import { isItemType } from "@/lib/types";

const LOCK_MS = 5 * 60 * 1000;

type VaultContextValue = {
  email: string;
  locked: boolean;
  busy: boolean;
  error: string | null;
  items: VaultItemDecrypted[];
  folders: FolderDecrypted[];
  unlockWithKey: (key: CryptoKey) => Promise<void>;
  unlockWithPassword: (password: string) => Promise<void>;
  lock: () => void;
  logout: () => Promise<void>;
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
  deleteItem: (id: string) => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  touch: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

let memoryKey: CryptoKey | null = null;

export function rememberVaultKey(key: CryptoKey | null) {
  memoryKey = key;
}

async function decryptItems(items: EncryptedItem[], key: CryptoKey) {
  const result: VaultItemDecrypted[] = [];
  for (const item of items) {
    if (!isItemType(item.type)) continue;
    try {
      const data = await decryptJson<ItemData>(item.cipherBlob, key);
      result.push({
        id: item.id,
        type: item.type,
        favorite: item.favorite,
        folderId: item.folderId,
        data,
        updatedAt: item.updatedAt,
      });
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
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const keyRef = useRef<CryptoKey | null>(memoryKey);
  const [locked, setLocked] = useState(!memoryKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<VaultItemDecrypted[]>([]);
  const [folders, setFolders] = useState<FolderDecrypted[]>([]);

  const loadVault = useCallback(async (key: CryptoKey) => {
    const [itemRes, folderRes] = await Promise.all([
      api<{ items: EncryptedItem[] }>("/api/items"),
      api<{ folders: EncryptedFolder[] }>("/api/folders"),
    ]);
    const [nextItems, nextFolders] = await Promise.all([
      decryptItems(itemRes.items, key),
      decryptFolders(folderRes.folders, key),
    ]);
    setItems(nextItems);
    setFolders(nextFolders);
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    rememberVaultKey(null);
    setItems([]);
    setFolders([]);
    setLocked(true);
  }, []);

  const touch = useCallback(() => {
    if (!keyRef.current) return;
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
    await api("/api/auth/logout", { method: "POST" });
    lock();
    window.location.href = "/login";
  }, [lock]);

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

  const deleteItem = useCallback(async (id: string) => {
    await api(`/api/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
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
    if (memoryKey) {
      void unlockWithKey(memoryKey);
    }
  }, [unlockWithKey]);

  useEffect(() => {
    if (locked) return;
    let timer = window.setTimeout(lock, LOCK_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, LOCK_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [locked, lock]);

  const value = useMemo(
    () => ({
      email,
      locked,
      busy,
      error,
      items,
      folders,
      unlockWithKey,
      unlockWithPassword,
      lock,
      logout,
      createItem,
      updateItem,
      deleteItem,
      createFolder,
      deleteFolder,
      touch,
    }),
    [
      email,
      locked,
      busy,
      error,
      items,
      folders,
      unlockWithKey,
      unlockWithPassword,
      lock,
      logout,
      createItem,
      updateItem,
      deleteItem,
      createFolder,
      deleteFolder,
      touch,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault debe usarse dentro de VaultProvider");
  return ctx;
}
