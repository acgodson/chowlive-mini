export type Profile = {
  id: string;
  service: 'spotify';
  isPremium: boolean;
  displayName?: string;
  avatarUrl?: string;
};

export interface FirebaseProfile {
  id: string;
  service: 'spotify';
  serviceId: string;
  serviceAvatarUrl?: string;
  serviceDisplayName?: string;
  displayName?: string;
  isPremium: boolean;
  updatedAt: number;
}
