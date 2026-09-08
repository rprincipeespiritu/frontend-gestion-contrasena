import {
  emptyData,
  isItemType,
  itemTitle,
  type CardData,
  type ContactData,
  type ItemData,
  type ItemType,
  type LoginData,
  type NoteData,
  type PasskeyData,
  type VaultItemDecrypted,
} from "@/lib/types";

export type ImportDraft = {
  type: ItemType;
  favorite: boolean;
  folder: string | null;
  data: ItemData;
};

export type ImportParseResult = {
  format: string;
  items: ImportDraft[];
  skipped: number;
  warnings: string[];
  headers?: string[];
};

const MAX_IMPORT = 2_000;

export const CSV_TEMPLATE = `name,url,username,password,notes,folder
Ejemplo,https://ejemplo.com,usuario,clave,nota opcional,Trabajo
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const text = str(value).toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "si" || text === "sí";
}

function hostFromUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function firstUri(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return str(value);
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
    const rec = asRecord(entry);
    const uri = str(rec?.uri || rec?.url);
    if (uri) return uri;
  }
  return "";
}

function extractFolderName(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = extractFolderName(entry);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return extractFolderName(rec.name ?? rec.title ?? rec.folder ?? rec.folderName);
  }
  let name = String(value).trim();
  if (!name) return null;
  if ((name.startsWith("[") && name.endsWith("]")) || (name.startsWith("{") && name.endsWith("}"))) {
    try {
      const nested = extractFolderName(JSON.parse(name));
      if (nested) return nested;
    } catch {
      /* usar el texto */
    }
  }
  if (name.includes(",") && !name.includes("/") && !name.includes("\\")) {
    name = name.split(",")[0]?.trim() ?? name;
  }
  if (/^(none|null|undefined|n\/a|-|sin carpeta|no folder|unassigned|unfiled)$/i.test(name)) {
    return null;
  }
  const parts = name
    .split(/[/\\]+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^root$/i.test(part));
  if (!parts.length) return null;
  return parts.join(" / ");
}

function loginData(partial: Partial<LoginData>): LoginData {
  const base = emptyData("login") as LoginData;
  const url = str(partial.url);
  const name = str(partial.name) || hostFromUrl(url) || str(partial.username) || "Contraseña";
  return {
    ...base,
    name,
    username: str(partial.username),
    password: str(partial.password),
    url,
    notes: str(partial.notes),
  };
}

function noteData(partial: Partial<NoteData>): NoteData {
  const base = emptyData("note") as NoteData;
  return {
    ...base,
    title: str(partial.title) || "Nota segura",
    content: str(partial.content),
  };
}

function cardData(partial: Partial<CardData>): CardData {
  const base = emptyData("card") as CardData;
  return {
    ...base,
    name: str(partial.name) || "Tarjeta",
    holder: str(partial.holder),
    number: str(partial.number).replace(/\s+/g, " "),
    expiry: str(partial.expiry),
    cvv: str(partial.cvv),
    notes: str(partial.notes),
  };
}

function contactData(partial: Partial<ContactData>): ContactData {
  const base = emptyData("contact") as ContactData;
  return {
    ...base,
    name: str(partial.name) || "Contacto",
    email: str(partial.email),
    phone: str(partial.phone),
    address: str(partial.address),
    notes: str(partial.notes),
  };
}

function passkeyData(partial: Partial<PasskeyData>): PasskeyData {
  const base = emptyData("passkey") as PasskeyData;
  return {
    ...base,
    name: str(partial.name) || "Passkey",
    username: str(partial.username),
    site: str(partial.site),
    notes: str(partial.notes),
  };
}

function hasContent(draft: ImportDraft): boolean {
  if (draft.type === "login") {
    const data = draft.data as LoginData;
    return Boolean(data.name || data.username || data.password || data.url);
  }
  if (draft.type === "note") {
    const data = draft.data as NoteData;
    return Boolean(data.title || data.content);
  }
  if (draft.type === "card") {
    const data = draft.data as CardData;
    return Boolean(data.number || data.holder || data.name);
  }
  if (draft.type === "contact") {
    const data = draft.data as ContactData;
    return Boolean(data.name || data.email || data.phone);
  }
  if (draft.type === "passkey") {
    const data = draft.data as PasskeyData;
    return Boolean(data.name || data.username || data.site);
  }
  return false;
}

export function draftTitle(draft: ImportDraft): string {
  return itemTitle({
    id: "",
    type: draft.type,
    favorite: draft.favorite,
    folderId: null,
    data: draft.data,
    lastUsedAt: null,
    deletedAt: null,
    updatedAt: "",
  });
}

function normalizeImportUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(href);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

function field(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function draftKey(draft: ImportDraft): string {
  if (draft.type === "login") {
    const data = draft.data as LoginData;
    return ["login", data.name, data.username, normalizeImportUrl(data.url)].join("\0").toLowerCase();
  }
  if (draft.type === "note") {
    const data = draft.data as NoteData;
    return ["note", data.title].join("\0").toLowerCase();
  }
  if (draft.type === "card") {
    const data = draft.data as CardData;
    const digits = data.number.replace(/\s/g, "");
    return ["card", data.name, digits.slice(-4)].join("\0").toLowerCase();
  }
  if (draft.type === "contact") {
    const data = draft.data as ContactData;
    return ["contact", data.name, data.email].join("\0").toLowerCase();
  }
  if (draft.type === "passkey") {
    const data = draft.data as PasskeyData;
    return ["passkey", data.name, data.username, data.site].join("\0").toLowerCase();
  }
  return [draft.type, draftTitle(draft)].join("\0").toLowerCase();
}

export function existingItemKey(item: VaultItemDecrypted): string {
  return draftKey({
    type: item.type,
    favorite: item.favorite,
    folder: null,
    data: item.data,
  });
}

export function findExistingItem(
  draft: ImportDraft,
  items: VaultItemDecrypted[],
  claimedIds?: Set<string>,
): VaultItemDecrypted | undefined {
  const candidates = items.filter((item) => item.type === draft.type && !claimedIds?.has(item.id));
  const exactKey = draftKey(draft);
  const exact = candidates.find((item) => existingItemKey(item) === exactKey);
  if (exact) return exact;

  if (draft.type === "login") {
    const wantName = field((draft.data as LoginData).name);
    const wantUser = field((draft.data as LoginData).username);
    const wantUrl = normalizeImportUrl((draft.data as LoginData).url);
    const ranked = candidates
      .map((item) => {
        const data = item.data as LoginData;
        const haveName = field(data.name);
        const haveUser = field(data.username);
        const haveUrl = normalizeImportUrl(data.url);
        let score = 0;
        if (wantUser && haveUser === wantUser) score += 2;
        if (wantUrl && haveUrl === wantUrl) score += 2;
        if (wantName && haveName === wantName) score += 1;
        return { item, score };
      })
      .filter((entry) => entry.score >= 3)
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.item;
  }

  if (draft.type === "note") {
    const title = field((draft.data as NoteData).title);
    const matches = candidates.filter((item) => field((item.data as NoteData).title) === title);
    if (matches.length === 1) return matches[0];
  }

  return undefined;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = {
    ",": (line.match(/,/g) ?? []).length,
    ";": (line.match(/;/g) ?? []).length,
    "\t": (line.match(/\t/g) ?? []).length,
  };
  if (counts["\t"] >= counts[","] && counts["\t"] >= counts[";"] && counts["\t"] > 0) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

function parseCsvWithDelimiter(text: string, delimiter: "," | ";" | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const key = header
      .trim()
      .toLowerCase()
      .replace(/^\ufeff/, "")
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_|_$/g, "");
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function cell(row: string[], headers: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const index = headers.get(name);
    if (index != null && row[index] != null) return row[index].trim();
  }
  return "";
}

function cellContaining(row: string[], headers: Map<string, number>, ...needles: string[]): string {
  for (const [key, index] of headers) {
    if (needles.some((needle) => key === needle || key.endsWith(`_${needle}`) || key.includes(needle))) {
      const value = row[index]?.trim() ?? "";
      if (value) return value;
    }
  }
  return "";
}

function csvType(raw: string, row: Record<string, string>): ItemType {
  const type = raw.toLowerCase();
  if (["card", "credit_card", "tarjeta", "payment_card"].includes(type)) return "card";
  if (["note", "secure_note", "nota", "secure note", "sn"].includes(type)) return "note";
  if (["identity", "contact", "contacto", "personal_info", "person"].includes(type)) {
    return "contact";
  }
  if (["passkey", "webauthn"].includes(type)) return "passkey";
  if (row.number && !row.password && !row.username && !row.url) return "card";
  if (row.content && !row.password && !row.url && !row.username) return "note";
  if (row.email && row.phone && !row.password && !row.url) return "contact";
  return "login";
}

function parseCsvImport(text: string): ImportParseResult {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvWithDelimiter(text, delimiter);
  if (rows.length < 2) {
    throw new Error("El CSV no tiene filas de datos. Incluye una cabecera y al menos un elemento.");
  }
  const headers = headerIndex(rows[0] ?? []);
  const items: ImportDraft[] = [];
  let skipped = 0;

  for (const raw of rows.slice(1)) {
    const row = {
      name: cell(raw, headers, "name", "title", "nombre", "titulo", "título"),
      url: cell(raw, headers, "url", "uri", "login_uri", "website", "web_site", "hostname"),
      username: cell(
        raw,
        headers,
        "username",
        "user",
        "login_username",
        "user_name",
        "login",
        "usuario",
      ),
      password: cell(
        raw,
        headers,
        "password",
        "login_password",
        "pass",
        "passwd",
        "contrasena",
        "contraseña",
        "clave",
      ),
      notes: cell(raw, headers, "notes", "note", "extra", "comments", "comentario"),
      folder: cell(
        raw,
        headers,
        "folder",
        "folders",
        "folder_name",
        "grouping",
        "group",
        "group_name",
        "carpeta",
        "carpetas",
        "collection",
        "collections",
        "category",
        "categories",
        "vault",
        "vault_name",
        "tags",
        "tag",
        "path",
        "directory",
        "dir",
        "grupo",
      ),
      favorite: cell(raw, headers, "favorite", "fav"),
      type: cell(raw, headers, "type", "item_type", "tipo"),
      holder: cell(raw, headers, "holder", "cardholdername", "cardholder", "cardholder_name", "name_on_card"),
      number: cell(raw, headers, "number", "cardnumber", "card_number", "cc_number"),
      expiry: cell(
        raw,
        headers,
        "expiry",
        "expirydate",
        "exp_date",
        "expiration",
        "exp",
        "card_exp",
      ),
      cvv: cell(raw, headers, "cvv", "cvc", "code", "card_code"),
      email: cell(raw, headers, "email", "correo"),
      phone: cell(raw, headers, "phone", "phone_number", "telefono", "teléfono"),
      address: cell(raw, headers, "address", "direccion", "dirección"),
      content: cell(raw, headers, "content", "secure_note", "text"),
      site: cell(raw, headers, "site", "rp_id"),
    };
    if (!row.folder) {
      row.folder = cellContaining(
        raw,
        headers,
        "folder",
        "carpeta",
        "grouping",
        "collection",
        "category",
        "vault",
        "tag",
        "grupo",
      );
    }
    if (!row.folder && headers.has("zipcode") && raw.length > 10) {
      row.folder = (raw[10] ?? "").trim();
    }

    const type = csvType(row.type, row);
    let draft: ImportDraft;
    if (type === "card") {
      draft = {
        type: "card",
        favorite: bool(row.favorite),
        folder: extractFolderName(row.folder),
        data: cardData({
          name: row.name,
          holder: row.holder || row.name,
          number: row.number,
          expiry: row.expiry,
          cvv: row.cvv,
          notes: row.notes,
        }),
      };
    } else if (type === "note") {
      draft = {
        type: "note",
        favorite: bool(row.favorite),
        folder: extractFolderName(row.folder),
        data: noteData({ title: row.name, content: row.content || row.notes }),
      };
    } else if (type === "contact") {
      draft = {
        type: "contact",
        favorite: bool(row.favorite),
        folder: extractFolderName(row.folder),
        data: contactData({
          name: row.name || row.username,
          email: row.email || row.username,
          phone: row.phone,
          address: row.address,
          notes: row.notes,
        }),
      };
    } else if (type === "passkey") {
      draft = {
        type: "passkey",
        favorite: bool(row.favorite),
        folder: extractFolderName(row.folder),
        data: passkeyData({
          name: row.name,
          username: row.username,
          site: row.site || row.url,
          notes: row.notes,
        }),
      };
    } else {
      draft = {
        type: "login",
        favorite: bool(row.favorite),
        folder: extractFolderName(row.folder),
        data: loginData({
          name: row.name,
          username: row.username || row.email,
          password: row.password,
          url: row.url,
          notes: row.notes,
        }),
      };
    }
    if (!hasContent(draft)) {
      skipped += 1;
      continue;
    }
    items.push(draft);
  }

  const headerLabels = (rows[0] ?? []).map((header) => header.trim()).filter(Boolean);
  const folderHeader = [...headers.keys()].some((key) =>
    /folder|carpeta|group|collect|categor|vault|tag|path|dir|grupo/.test(key),
  );

  return {
    format: delimiter === ";" ? "CSV (;)" : delimiter === "\t" ? "TSV" : "CSV",
    items,
    skipped,
    headers: headerLabels,
    warnings: folderHeader
      ? []
      : [
          "Este archivo no trae una columna de carpetas. Exporta CSV/JSON con carpetas (NordPass, Bitwarden, LastPass). Chrome y Firefox no incluyen carpetas.",
        ],
  };
}

function idNameMap(...lists: unknown[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const id = str(rec.id) || str(rec.uuid);
      const name = extractFolderName(rec.name ?? rec.title);
      if (id && name) map.set(id, name);
    }
  }
  return map;
}

function folderForItem(rec: Record<string, unknown>, named: Map<string, string>): string | null {
  const fromId = named.get(str(rec.folderId)) || named.get(str(rec.folder_id));
  if (fromId) return fromId;
  const collectionIds = rec.collectionIds ?? rec.collection_ids;
  const ids = Array.isArray(collectionIds) ? collectionIds : collectionIds ? [collectionIds] : [];
  for (const id of ids) {
    const name = named.get(str(id));
    if (name) return name;
  }
  return extractFolderName(
    rec.folder ??
      rec.folderName ??
      rec.category ??
      rec.vault ??
      rec.collections ??
      rec.collection ??
      rec.tags,
  );
}

function dropFolderPlaceholders(items: ImportDraft[]): ImportDraft[] {
  const folderNames = new Set(
    items.map((item) => item.folder?.trim().toLowerCase()).filter((name): name is string => Boolean(name)),
  );
  if (!folderNames.size) return items;
  return items.filter((item) => {
    if (item.folder || item.type !== "login") return true;
    const data = item.data as LoginData;
    const empty = !data.username && !data.password && !data.url && !data.notes;
    return !(empty && folderNames.has(data.name.trim().toLowerCase()));
  });
}

function parseCifralock(payload: Record<string, unknown>): ImportParseResult {
  const list = Array.isArray(payload.items) ? payload.items : [];
  const named = idNameMap(payload.folders, payload.collections);
  const items: ImportDraft[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  for (const entry of list) {
    const rec = asRecord(entry);
    if (!rec) {
      skipped += 1;
      continue;
    }
    const typeRaw = str(rec.type).toLowerCase();
    const mappedType =
      typeRaw === "password" || typeRaw === "login"
        ? "login"
        : typeRaw === "secure_note" || typeRaw === "secure note"
          ? "note"
          : typeRaw === "credit_card" || typeRaw === "payment_card"
            ? "card"
            : typeRaw === "identity" || typeRaw === "personal_info"
              ? "contact"
              : typeRaw;
    if (!isItemType(mappedType) || mappedType === "document") {
      skipped += 1;
      if (mappedType === "document") {
        warnings.push("Los documentos con archivo no se importan; copia el archivo a mano.");
      }
      continue;
    }
    const data = asRecord(rec.data) ?? rec;
    const folder = folderForItem(rec, named) ?? extractFolderName(data.folder);
    const favorite = bool(rec.favorite);
    let draft: ImportDraft;
    if (mappedType === "login") {
      draft = { type: "login", favorite, folder, data: loginData(data as Partial<LoginData>) };
    } else if (mappedType === "note") {
      draft = {
        type: "note",
        favorite,
        folder,
        data: noteData({
          title: str(data.title) || str(data.name),
          content: str(data.content) || str(data.notes),
        }),
      };
    } else if (mappedType === "card") {
      draft = { type: "card", favorite, folder, data: cardData(data as Partial<CardData>) };
    } else if (mappedType === "contact") {
      draft = { type: "contact", favorite, folder, data: contactData(data as Partial<ContactData>) };
    } else {
      draft = { type: "passkey", favorite, folder, data: passkeyData(data as Partial<PasskeyData>) };
    }
    if (!hasContent(draft)) {
      skipped += 1;
      continue;
    }
    items.push(draft);
  }

  return { format: "CifraLock JSON", items, skipped, warnings: [...new Set(warnings)] };
}

function parseBitwarden(payload: Record<string, unknown>): ImportParseResult {
  if (payload.encrypted === true) {
    throw new Error("Ese archivo de Bitwarden está cifrado. Exporta de nuevo sin cifrado.");
  }
  const named = idNameMap(payload.folders, payload.collections);
  const list = Array.isArray(payload.items) ? payload.items : [];
  const items: ImportDraft[] = [];
  let skipped = 0;

  for (const entry of list) {
    const rec = asRecord(entry);
    if (!rec) {
      skipped += 1;
      continue;
    }
    const bwType = Number(rec.type);
    const name = str(rec.name);
    const notes = str(rec.notes);
    const folder = folderForItem(rec, named);
    const favorite = bool(rec.favorite);
    let draft: ImportDraft | null = null;

    if (bwType === 1 || rec.login) {
      const login = asRecord(rec.login) ?? {};
      draft = {
        type: "login",
        favorite,
        folder,
        data: loginData({
          name,
          username: str(login.username),
          password: str(login.password),
          url: firstUri(login.uris) || str(login.uri),
          notes,
        }),
      };
    } else if (bwType === 2 || rec.secureNote) {
      draft = {
        type: "note",
        favorite,
        folder,
        data: noteData({ title: name, content: notes }),
      };
    } else if (bwType === 3 || rec.card) {
      const card = asRecord(rec.card) ?? {};
      const month = str(card.expMonth).padStart(2, "0");
      const year = str(card.expYear);
      const expiry = month && year ? `${month}/${year.slice(-2)}` : str(card.expMonth);
      draft = {
        type: "card",
        favorite,
        folder,
        data: cardData({
          name,
          holder: str(card.cardholderName),
          number: str(card.number),
          expiry,
          cvv: str(card.code),
          notes,
        }),
      };
    } else if (bwType === 4 || rec.identity) {
      const identity = asRecord(rec.identity) ?? {};
      const fullName =
        [str(identity.firstName), str(identity.lastName)].filter(Boolean).join(" ") || name;
      draft = {
        type: "contact",
        favorite,
        folder,
        data: contactData({
          name: fullName,
          email: str(identity.email),
          phone: str(identity.phone),
          address: [str(identity.address1), str(identity.city), str(identity.country)]
            .filter(Boolean)
            .join(", "),
          notes,
        }),
      };
    }

    if (!draft || !hasContent(draft)) {
      skipped += 1;
      continue;
    }
    items.push(draft);
  }

  return { format: "Bitwarden JSON", items, skipped, warnings: [] };
}

function looksLikeBitwarden(payload: Record<string, unknown>): boolean {
  if (payload.encrypted === true && Array.isArray(payload.items)) return true;
  if (!Array.isArray(payload.items) || payload.items.length === 0) return false;
  const first = asRecord(payload.items[0]);
  return Boolean(first && ("login" in first || "secureNote" in first || typeof first.type === "number"));
}

export function parseImportText(filename: string, text: string): ImportParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("El archivo está vacío.");

  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[") || filename.endsWith(".json");
  if (looksJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("El JSON no es válido.");
    }
    const payload = Array.isArray(parsed) ? { items: parsed } : asRecord(parsed);
    if (!payload) throw new Error("El JSON no contiene elementos.");
    if (payload.cifralock != null || payload.app === "cifralock") {
      return finalize(parseCifralock(payload));
    }
    if (looksLikeBitwarden(payload)) return finalize(parseBitwarden(payload));
    if (Array.isArray(payload.items)) return finalize(parseCifralock(payload));
    throw new Error("No se reconoció el JSON. Usa CSV, Bitwarden (sin cifrar) o JSON de CifraLock.");
  }

  return finalize(parseCsvImport(trimmed));
}

function finalize(result: ImportParseResult): ImportParseResult {
  const warnings = [...result.warnings];
  let items = dropFolderPlaceholders(result.items);
  const dropped = result.items.length - items.length;
  let skipped = result.skipped + dropped;
  if (items.length > MAX_IMPORT) {
    skipped += items.length - MAX_IMPORT;
    items = items.slice(0, MAX_IMPORT);
    warnings.push(`Se importarán como máximo ${MAX_IMPORT} elementos en esta tanda.`);
  }
  return { ...result, items, skipped, warnings };
}

export function parseImportFile(file: File): Promise<ImportParseResult> {
  if (file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("El archivo supera 5 MB."));
  }
  return file.text().then((text) => parseImportText(file.name.toLowerCase(), text));
}
