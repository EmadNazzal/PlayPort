export type Role = 'admin' | 'gamer' | 'partner';

export type Me = {
  id: string;
  email: string | null;
  emailVerifiedAt: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  roles: Role[];
  createdAt: string;
};

export type GamerProfile = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  dateOfBirth: string | null;
  createdAt: string;
};

export type Game = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  genres: string[];
  platforms: string[];
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  /** Lamports as a decimal string. */
  priceLamports: string;
  minAge: number | null;
  publishedAt: string | null;
  partner: { id: string; name: string; slug: string; logoUrl: string | null };
};

export type Genre = { genre: string; games: number };

export type LibraryItem = {
  gameId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  launchUrl: string;
  acquiredAt: string;
};

export type Wallet = {
  id: string;
  address: string;
  label: string | null;
  isPrimary: boolean;
  verifiedAt: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  gameId: string;
  amountLamports: string;
  recipientAddress: string;
  reference: string;
  txSignature: string | null;
  payerAddress: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
  solanaPayUrl?: string;
};

export type TokenResponse = { accessToken: string; tokenType: 'Bearer'; expiresIn: number; isNewUser?: boolean };
export type Nonce = { nonce: string; message: string; expiresAt: string };
