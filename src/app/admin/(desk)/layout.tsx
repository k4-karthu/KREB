import type { Metadata } from 'next';
import { requireStaffPage } from '@/server/auth';
import { AdminShell } from '@/ui/components/AdminShell';

export const metadata: Metadata = {
  title: 'Operations Desk',
  robots: { index: false, follow: false },
};

export default async function AdminDeskLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireStaffPage('admin.access');
  return <AdminShell actor={actor}>{children}</AdminShell>;
}
