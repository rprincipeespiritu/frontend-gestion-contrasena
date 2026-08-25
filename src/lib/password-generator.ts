const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";

export type GeneratorOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

export const defaultGeneratorOptions: GeneratorOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

function randomIndex(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function pick(charset: string) {
  return charset[randomIndex(charset.length)];
}

export function generatePassword(options: GeneratorOptions): string {
  const pools: string[] = [];
  if (options.lowercase) pools.push(LOWER);
  if (options.uppercase) pools.push(UPPER);
  if (options.numbers) pools.push(NUMBERS);
  if (options.symbols) pools.push(SYMBOLS);
  if (pools.length === 0) return "";

  const all = pools.join("");
  const length = Math.min(64, Math.max(8, options.length));
  const chars: string[] = pools.map((pool) => pick(pool));

  while (chars.length < length) {
    chars.push(pick(all));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
