const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const KDF_ITERATIONS = 600_000;

export function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): string {
  return bufToB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveMasterMaterial(
  password: string,
  saltB64: string,
  iterations: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: b64ToBytes(saltB64) as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
}

export async function masterKeyFromMaterial(material: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function authHashFromMaterial(material: ArrayBuffer): Promise<string> {
  const key = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("auth"),
      iterations: 1,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bufToB64(bits);
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptBytes(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as BufferSource),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return packed;
}

export async function decryptBytes(packed: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  if (packed.length < 13) throw new Error("Ciphertext inválido");
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      cipher as BufferSource,
    ),
  );
}

async function aesEncrypt(data: BufferSource, key: CryptoKey): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  return bufToB64(await encryptBytes(bytes, key));
}

async function aesDecrypt(payloadB64: string, key: CryptoKey): Promise<ArrayBuffer> {
  const packed = b64ToBytes(payloadB64);
  if (packed.length < 13) throw new Error("Ciphertext inválido");
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  );
}

export async function protectVaultKey(
  vaultKey: CryptoKey,
  masterKey: CryptoKey,
): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", vaultKey);
  return aesEncrypt(raw, masterKey);
}

export async function unprotectVaultKey(
  protectedB64: string,
  masterKey: CryptoKey,
): Promise<CryptoKey> {
  const raw = await aesDecrypt(protectedB64, masterKey);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson(data: unknown, vaultKey: CryptoKey): Promise<string> {
  return aesEncrypt(encoder.encode(JSON.stringify(data)), vaultKey);
}

export async function decryptJson<T>(cipherB64: string, vaultKey: CryptoKey): Promise<T> {
  const plain = await aesDecrypt(cipherB64, vaultKey);
  return JSON.parse(decoder.decode(plain)) as T;
}

export async function prepareRegister(email: string, password: string) {
  const kdfSalt = generateSalt();
  const material = await deriveMasterMaterial(password, kdfSalt, KDF_ITERATIONS);
  const masterKey = await masterKeyFromMaterial(material);
  const vaultKey = await generateVaultKey();
  const protectedVaultKey = await protectVaultKey(vaultKey, masterKey);
  const authHash = await authHashFromMaterial(material);
  return {
    email: email.trim().toLowerCase(),
    authHash,
    kdfSalt,
    kdfIterations: KDF_ITERATIONS,
    protectedVaultKey,
    vaultKey,
  };
}

export async function unlockVaultKey(
  password: string,
  kdfSalt: string,
  kdfIterations: number,
  protectedVaultKey: string,
) {
  const material = await deriveMasterMaterial(password, kdfSalt, kdfIterations);
  const masterKey = await masterKeyFromMaterial(material);
  const authHash = await authHashFromMaterial(material);
  const vaultKey = await unprotectVaultKey(protectedVaultKey, masterKey);
  return { vaultKey, authHash };
}

export function generateRecoveryCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return (out.match(/.{1,4}/g) ?? [out]).join("-");
}

