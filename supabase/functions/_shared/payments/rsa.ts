// RSAES-PKCS1-v1_5 pour le PIN de décaissement Airtel (imposé : RSA 1024,
// « ECB », PKCS1Padding — cf. docs/integrations/airtel-money-evaluation.md §6.5).
// WebCrypto ne propose pas ce padding en chiffrement (OAEP seulement) : on
// implémente l'opération publique (m^e mod n) en BigInt, sans dépendance.
// Le PIN et la clé ne vivent que côté serveur (secret store).

export interface RsaPublicKey {
  n: bigint;
  e: bigint;
  /** Taille du module en octets (128 pour 1024 bits). */
  k: number;
}

// --- Lecture DER minimale (SEQUENCE / INTEGER / BIT STRING) -----------------

class DerReader {
  private offset = 0;
  constructor(private readonly bytes: Uint8Array) {}

  private readLength(): number {
    let length = this.bytes[this.offset++];
    if (length & 0x80) {
      const count = length & 0x7f;
      length = 0;
      for (let i = 0; i < count; i++) length = length * 256 + this.bytes[this.offset++];
    }
    return length;
  }

  /** Entre dans un conteneur (SEQUENCE 0x30, BIT STRING 0x03…). */
  enter(expectedTag: number): DerReader {
    const tag = this.bytes[this.offset++];
    if (tag !== expectedTag) throw new Error(`DER : balise ${tag} ≠ ${expectedTag}`);
    const length = this.readLength();
    let start = this.offset;
    if (expectedTag === 0x03) start++; // octet « bits inutilisés » du BIT STRING
    this.offset += length;
    return new DerReader(this.bytes.subarray(start, this.offset));
  }

  /** Saute l'élément courant (ex. AlgorithmIdentifier). */
  skip(): void {
    this.offset++;
    const length = this.readLength(); // (`+=` figerait offset AVANT l'appel)
    this.offset += length;
  }

  readInteger(): bigint {
    const tag = this.bytes[this.offset++];
    if (tag !== 0x02) throw new Error(`DER : entier attendu, balise ${tag}`);
    const length = this.readLength();
    let value = 0n;
    for (let i = 0; i < length; i++) value = (value << 8n) | BigInt(this.bytes[this.offset++]);
    return value;
  }
}

function pemToBytes(pem: string): Uint8Array {
  const base64 = pem.replace(/-----(BEGIN|END)[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Accepte les deux formats usuels : SPKI (« BEGIN PUBLIC KEY ») et
 *  PKCS#1 (« BEGIN RSA PUBLIC KEY ») — la doc Airtel fournit la clé sans
 *  préciser l'enveloppe. */
export function parseRsaPublicKeyPem(pem: string): RsaPublicKey {
  const outer = new DerReader(pemToBytes(pem)).enter(0x30);
  let keySequence: DerReader;
  if (pem.includes("BEGIN RSA PUBLIC KEY")) {
    keySequence = outer; // PKCS#1 : SEQUENCE { n, e } directement
  } else {
    outer.skip(); // AlgorithmIdentifier
    keySequence = outer.enter(0x03).enter(0x30); // BIT STRING → SEQUENCE { n, e }
  }
  const n = keySequence.readInteger();
  const e = keySequence.readInteger();
  return { n, e, k: Math.ceil(n.toString(16).length / 2) };
}

// --- Chiffrement -------------------------------------------------------------

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** EME-PKCS1-v1_5 : 0x00 0x02 ‖ bourrage aléatoire NON NUL (≥ 8) ‖ 0x00 ‖ M,
 *  puis opération publique. Résultat en Base64 (format attendu par Airtel). */
export function rsaEncryptPkcs1v15(message: Uint8Array, key: RsaPublicKey): Uint8Array {
  if (message.length > key.k - 11) {
    throw new Error(`RSA : message trop long (${message.length} > ${key.k - 11})`);
  }
  const padded = new Uint8Array(key.k);
  padded[0] = 0x00;
  padded[1] = 0x02;
  const padding = padded.subarray(2, key.k - message.length - 1);
  crypto.getRandomValues(padding);
  for (let i = 0; i < padding.length; i++) {
    while (padding[i] === 0) {
      const one = new Uint8Array(1);
      crypto.getRandomValues(one);
      padding[i] = one[0];
    }
  }
  padded[key.k - message.length - 1] = 0x00;
  padded.set(message, key.k - message.length);
  return bigIntToBytes(modPow(bytesToBigInt(padded), key.e, key.n), key.k);
}

/** Le PIN chauffeur chiffré, prêt pour `disbursements` (Base64). */
export function encryptPinForAirtel(pin: string, publicKeyPem: string): string {
  const cipher = rsaEncryptPkcs1v15(new TextEncoder().encode(pin), parseRsaPublicKeyPem(publicKeyPem));
  let binary = "";
  for (const byte of cipher) binary += String.fromCharCode(byte);
  return btoa(binary);
}
