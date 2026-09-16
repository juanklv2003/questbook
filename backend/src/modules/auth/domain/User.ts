export interface User {
  id: string;
  email: string;
  passwordHash: string;
  provider: string; // 'email' or 'google'
  providerId?: string; // Google ID if provider is 'google'
  createdAt: Date;
  updatedAt: Date;
}
