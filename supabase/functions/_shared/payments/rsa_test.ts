// Tests du chiffrement PIN Airtel (RSA PKCS#1 v1.5) — clé de TEST générée
// pour ces tests (jamais utilisée ailleurs) : le déchiffrement avec
// l'exposant privé embarqué prouve le bourrage et l'opération publique.
import { assert, assertEquals, assertThrows } from "@std/assert";
import { modPow, parseRsaPublicKeyPem, rsaEncryptPkcs1v15 } from "./rsa.ts";

const SPKI_PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDpYe8pwkqCquLhVs5QyzpqQ4w9
IUO1HHatTXCZcUYso2L48c4DKuseB2wCnTWAVSg/zNI3Jq6LDUImTWvRsSpJKgT8
MFVZ0cuWWgtYqPnuM5YEZntVC+yKp44sJ/BLst1BlPPEXSe9GzzGa1Kb8oVBAZ6Z
PEiUuOLZAh5fX5TV2QIDAQAB
-----END PUBLIC KEY-----`;

const PKCS1_PEM = `-----BEGIN RSA PUBLIC KEY-----
MIGJAoGBAOlh7ynCSoKq4uFWzlDLOmpDjD0hQ7Ucdq1NcJlxRiyjYvjxzgMq6x4H
bAKdNYBVKD/M0jcmrosNQiZNa9GxKkkqBPwwVVnRy5ZaC1io+e4zlgRme1UL7Iqn
jiwn8Euy3UGU88RdJ70bPMZrUpvyhUEBnpk8SJS44tkCHl9flNXZAgMBAAE=
-----END RSA PUBLIC KEY-----`;

const N = BigInt(
  "0xe961ef29c24a82aae2e156ce50cb3a6a438c3d2143b51c76ad4d709971462ca362f8f1ce032aeb1e076c029d358055283fccd23726ae8b0d42264d6bd1b12a492a04fc305559d1cb965a0b58a8f9ee339604667b550bec8aa78e2c27f04bb2dd4194f3c45d27bd1b3cc66b529bf28541019e993c4894b8e2d9021e5f5f94d5d9",
);
const D = BigInt(
  "0x40dd76628ddcb5ba973a782cf9a9b27fac6c82e506f38488bb9c256a906027b1f5a52957cfeb92d392ce835f7c6a41c0e112a56eacb2a0753be877663b2ed9885a5214fa52453cf2b8a2475caa56f288e5826fc5b800bfb9d9e7dde78dae2fc8c46d72efaae21cb7e26c085b3d738e3ccd0403566372412317217f35fe4224b1",
);

function decrypt(cipher: Uint8Array): Uint8Array {
  let c = 0n;
  for (const byte of cipher) c = (c << 8n) | BigInt(byte);
  let m = modPow(c, D, N);
  const bytes: number[] = [];
  while (m > 0n) {
    bytes.unshift(Number(m & 0xffn));
    m >>= 8n;
  }
  return new Uint8Array(bytes); // le 0x00 de tête disparaît (BigInt)
}

Deno.test("parseRsaPublicKeyPem lit SPKI et PKCS#1 (même clé)", () => {
  const spki = parseRsaPublicKeyPem(SPKI_PEM);
  const pkcs1 = parseRsaPublicKeyPem(PKCS1_PEM);
  assertEquals(spki.n, N);
  assertEquals(spki.e, 65537n);
  assertEquals(spki.k, 128);
  assertEquals(pkcs1.n, spki.n);
  assertEquals(pkcs1.e, spki.e);
});

Deno.test("rsaEncryptPkcs1v15 : bourrage conforme, déchiffrable, non déterministe", () => {
  const key = parseRsaPublicKeyPem(SPKI_PEM);
  const pin = new TextEncoder().encode("1234");
  const c1 = rsaEncryptPkcs1v15(pin, key);
  const c2 = rsaEncryptPkcs1v15(pin, key);
  assertEquals(c1.length, 128);
  assert(c1.join() !== c2.join(), "le bourrage aléatoire doit varier");

  const em = decrypt(c1); // 0x02 ‖ PS ‖ 0x00 ‖ M (le 0x00 initial est absorbé)
  assertEquals(em[0], 0x02);
  const separator = em.indexOf(0x00, 1);
  assert(separator >= 9, "au moins 8 octets de bourrage non nul");
  assertEquals(new TextDecoder().decode(em.subarray(separator + 1)), "1234");
});

Deno.test("rsaEncryptPkcs1v15 refuse un message trop long", () => {
  const key = parseRsaPublicKeyPem(SPKI_PEM);
  assertThrows(() => rsaEncryptPkcs1v15(new Uint8Array(118), key));
});
