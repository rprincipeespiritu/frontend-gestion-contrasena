import { api } from "@/lib/api";
import { decryptBytes, encryptBytes } from "@/lib/crypto";

export const MAX_VAULT_FILE_BYTES = 20 * 1024 * 1024;

export async function uploadVaultFile(file: File, vaultKey: CryptoKey) {
  if (file.size > MAX_VAULT_FILE_BYTES) {
    throw new Error("El archivo no puede superar 20 MB");
  }
  const packed = await encryptBytes(new Uint8Array(await file.arrayBuffer()), vaultKey);
  const signed = await api<{ key: string; uploadUrl: string }>("/api/files/url", {
    method: "POST",
    body: JSON.stringify({ contentType: "application/octet-stream" }),
  });
  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([new Uint8Array(packed)]),
  });
  if (!put.ok) {
    throw new Error("S3 rechazó la subida. Revisa CORS del bucket y las credenciales.");
  }
  return {
    fileKey: signed.key,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}

export async function downloadVaultFile(
  fileKey: string,
  vaultKey: CryptoKey,
  fileName: string,
  mimeType: string,
) {
  const { downloadUrl } = await api<{ downloadUrl: string }>("/api/files/download-url", {
    method: "POST",
    body: JSON.stringify({ key: fileKey }),
  });
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error("No se pudo descargar el archivo de S3");
  const packed = new Uint8Array(await res.arrayBuffer());
  const plain = await decryptBytes(packed, vaultKey);
  const blob = new Blob([new Uint8Array(plain)], { type: mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "archivo";
  a.click();
  URL.revokeObjectURL(url);
}

export async function deleteVaultFile(fileKey: string) {
  await api(`/api/files?key=${encodeURIComponent(fileKey)}`, { method: "DELETE" });
}
