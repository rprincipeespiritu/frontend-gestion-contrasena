"use client";

import { api, ApiError } from "@/lib/api";

export function initialsFromEmail(email: string) {
  const local = email.split("@")[0] || "V";
  const first = local[0] ?? "V";
  const second = local[1] ?? "";
  return (first + second).replace(/^./, (c) => c.toUpperCase());
}

export async function uploadProfilePhoto(file: File) {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("La foto no puede superar 2 MB");
  }
  const signed = await api<{ key: string; uploadUrl: string }>("/api/auth/avatar/url", {
    method: "POST",
    body: JSON.stringify({ contentType: file.type }),
  });
  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error("S3 rechazó la subida. Revisa CORS del bucket y las credenciales.");
  }
  const saved = await api<{ avatarUrl: string }>("/api/auth/avatar", {
    method: "PUT",
    body: JSON.stringify({ key: signed.key }),
  });
  return saved.avatarUrl;
}

export function avatarErrorMessage(err: unknown) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "No se pudo actualizar la foto";
}
