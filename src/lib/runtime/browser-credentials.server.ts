import crypto from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function masterKey(raw = process.env["BROWSER_CREDENTIALS_MASTER_KEY"] ?? ""): Buffer {
  const value = raw.trim();
  let key: Buffer;
  if (/^[a-f0-9]{64}$/i.test(value)) key = Buffer.from(value, "hex");
  else {
    try { key = Buffer.from(value, "base64"); } catch { key = Buffer.alloc(0); }
  }
  if (key.length !== 32) {
    throw new Error("BROWSER_CREDENTIALS_MASTER_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

export function sealBrowserSecret(value: string, rawKey?: string): string {
  if (!value) throw new Error("Cannot encrypt an empty browser secret.");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(rawKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function openBrowserSecret(value: string, rawKey?: string): string {
  const [version, ivPart, tagPart, ciphertextPart] = value.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Browser credential ciphertext is malformed or unsupported.");
  }
  const iv = Buffer.from(ivPart, "base64url");
  const tag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(ciphertextPart, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || !ciphertext.length) {
    throw new Error("Browser credential ciphertext is malformed.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(rawKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  if (!clean) throw new Error("TOTP secret is empty or invalid.");
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("TOTP secret contains unsupported base32 characters.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(
  base32Secret: string,
  atMs = Date.now(),
  options: { periodSeconds?: number; digits?: number } = {},
): string {
  const periodSeconds = Math.max(15, Math.min(120, Math.trunc(options.periodSeconds ?? 30)));
  const digits = Math.max(6, Math.min(8, Math.trunc(options.digits ?? 6)));
  const counter = Math.floor(atMs / 1000 / periodSeconds);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(base32Secret)).update(message).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = ((digest[offset] ?? 0) & 0x7f) << 24 |
    ((digest[offset + 1] ?? 0) & 0xff) << 16 |
    ((digest[offset + 2] ?? 0) & 0xff) << 8 |
    ((digest[offset + 3] ?? 0) & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export type BrowserCredentialRuntimeValue = {
  id: string;
  name: string;
  domain: string;
  username: string | null;
  password: string | null;
  totpCode: string | null;
  totpIdentifier: string | null;
};

type Sb = { from: (table: string) => any };

export async function resolveBrowserCredential(args: {
  sb: Sb;
  userId: string;
  credentialId: string;
  requestedDomain?: string | null;
  nowMs?: number;
}): Promise<BrowserCredentialRuntimeValue> {
  const { data, error } = await args.sb
    .from("browser_credentials")
    .select("id,user_id,name,domain,username_ciphertext,password_ciphertext,totp_secret_ciphertext,totp_identifier")
    .eq("id", args.credentialId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error || !data) throw new Error("Browser credential was not found for this user.");

  const domain = String(data.domain || "").toLowerCase().replace(/^www\./, "");
  const requested = String(args.requestedDomain || "").toLowerCase().replace(/^www\./, "");
  if (requested && requested !== domain && !requested.endsWith(`.${domain}`)) {
    throw new Error("Browser credential is not valid for the requested domain.");
  }

  const decode = (ciphertext: unknown) => typeof ciphertext === "string" && ciphertext ? openBrowserSecret(ciphertext) : null;
  const totpSecret = decode(data.totp_secret_ciphertext);
  return {
    id: String(data.id),
    name: String(data.name),
    domain,
    username: decode(data.username_ciphertext),
    password: decode(data.password_ciphertext),
    totpCode: totpSecret ? generateTotpCode(totpSecret, args.nowMs) : null,
    totpIdentifier: typeof data.totp_identifier === "string" ? data.totp_identifier : null,
  };
}

export function browserCredentialAuditMetadata(value: BrowserCredentialRuntimeValue) {
  return {
    credential_id: value.id,
    credential_name: value.name,
    domain: value.domain,
    has_username: Boolean(value.username),
    has_password: Boolean(value.password),
    has_totp: Boolean(value.totpCode),
    totp_identifier: value.totpIdentifier,
  };
}
