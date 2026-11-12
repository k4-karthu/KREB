import type { Metadata } from 'next';
import { BRAND } from '@/config/brand';
import { MotionProvider } from '@/ui/motion/MotionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    'Self-drive car rentals with live availability, total prices upfront, and clear fuel and deposit rules.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-petrol-800 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-m focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-petrol-950 focus:font-medium"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
