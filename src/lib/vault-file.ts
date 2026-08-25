import { api } from "@/lib/api";
import { decryptBytes, encryptBytes } from "@/lib/crypto";

export const MAX_VAULT_FILE_BYTES = 20 * 1024 * 1024;

const GOOGLE_SHORTCUTS = new Set([
  ".gdoc",
  ".gsheet",
  ".gslides",
  ".gdraw",
  ".gtable",
  ".gform",
  ".gmap",
]);

function fileExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function fileUploadErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  const name = err instanceof DOMException ? err.name : "";
  if (
    name === "NotReadableError" ||
    message.includes("could not be read") ||
    message.includes("permission problems")
  ) {
    return "No se pudo leer el archivo. Si está en Google Drive o OneDrive, ábrelo y expórtalo (PDF, DOCX, etc.) a una carpeta local.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "No se pudo subir el archivo";
}

async function readFileBytes(file: File) {
  const ext = fileExtension(file.name);
  if (GOOGLE_SHORTCUTS.has(ext)) {
    throw new Error(
      "Ese archivo es un acceso directo de Google Drive (.gdoc), no el documento. En Drive: Archivo → Descargar → PDF o DOCX, y sube esa copia.",
    );
  }
  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch (err) {
    throw new Error(fileUploadErrorMessage(err));
  }
}

export async function uploadVaultFile(file: File, vaultKey: CryptoKey) {
  if (file.size > MAX_VAULT_FILE_BYTES) {
    throw new Error("El archivo no puede superar 20 MB");
  }
  const bytes = await readFileBytes(file);
  if (bytes.byteLength === 0) {
    throw new Error("El archivo está vacío o no se pudo leer. Prueba con una copia local (PDF, DOCX, imagen).");
  }
  const packed = await encryptBytes(bytes, vaultKey);
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
    size: file.size || bytes.byteLength,
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
