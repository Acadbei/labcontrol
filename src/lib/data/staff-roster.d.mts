import type { User } from '@/types';

export type StaffRosterUser = User & {
  staffRosterId: string;
  loginId: string;
  identitySource: string;
};

export function parseStaffRoster(text: string): StaffRosterUser[];
