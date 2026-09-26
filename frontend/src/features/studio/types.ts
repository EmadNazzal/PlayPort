export type PartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type GameStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type MemberRole = 'owner' | 'admin' | 'developer';

export type Partner = {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  websiteUrl: string;
  contactEmail: string;
  logoUrl: string | null;
  description: string | null;
  country: string | null;
  payoutWalletAddress: string | null;
  webhookUrl: string | null;
  status: PartnerStatus;
  statusReason: string | null;
  createdAt: string;
};

export type StudioGame = {
  id: string;
  partnerId: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  genres: string[];
  platforms: string[];
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  launchUrl: string;
  priceLamports: string;
  minAge: number | null;
  status: GameStatus;
  statusReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Member = { userId: string; email: string | null; displayName: string | null; role: MemberRole; addedAt: string };

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type Sale = {
  id: string;
  gameId: string;
  amountLamports: string;
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  txSignature: string | null;
  confirmedAt: string | null;
  createdAt: string;
};
