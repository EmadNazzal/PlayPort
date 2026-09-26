import bs58 from 'bs58';
import nacl from 'tweetnacl';

/** Sign-In With Solana message (CAIP-122 / EIP-4361 style) so wallets show a readable prompt. */
export const buildSiwsMessage = (p: {
  domain: string;
  uri: string;
  address: string;
  statement: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}): string =>
  [
    `${p.domain} wants you to sign in with your Solana account:`,
    p.address,
    '',
    p.statement,
    '',
    `URI: ${p.uri}`,
    'Version: 1',
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt.toISOString()}`,
    `Expiration Time: ${p.expiresAt.toISOString()}`,
  ].join('\n');

export const verifySolanaSignature = (message: string, signatureB58: string, addressB58: string): boolean => {
  try {
    return nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signatureB58), bs58.decode(addressB58));
  } catch {
    return false;
  }
};
