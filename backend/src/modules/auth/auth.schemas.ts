import { z } from 'zod';
import { zEmail, zPassword, zSolanaAddress, zUsername } from '../../shared/validation.js';

export const RegisterSchema = z.discriminatedUnion('accountType', [
  z.object({ accountType: z.literal('gamer'), email: zEmail, password: zPassword, username: zUsername }),
  /** Partner staff: an account first, then `POST /partners` to apply. */
  z.object({ accountType: z.literal('partner'), email: zEmail, password: zPassword, displayName: z.string().trim().min(1).max(80) }),
]);
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({ email: zEmail, password: z.string().min(1).max(128) });

export const WalletNonceSchema = z.object({ address: zSolanaAddress });

export const WalletLoginSchema = z.object({
  address: zSolanaAddress,
  nonce: z.string().min(16).max(64),
  /** base58 ed25519 signature over the exact message returned by /auth/wallet/nonce. */
  signature: z.string().min(64).max(128),
});
export type WalletLoginInput = z.infer<typeof WalletLoginSchema>;

/** Browsers use the httpOnly cookie; native clients may send the token in the body. */
export const RefreshSchema = z.object({ refreshToken: z.string().min(20).max(200).optional() }).default({});

export const TokenSchema = z.object({ token: z.string().min(20).max(200) });
export const EmailOnlySchema = z.object({ email: zEmail });
export const ResetPasswordSchema = z.object({ token: z.string().min(20).max(200), newPassword: zPassword });
export const ChangePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: zPassword });
