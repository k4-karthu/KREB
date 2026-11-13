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
      <body className="min-h-screen bg-canvas text-text-1 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-m focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent focus:font-medium shadow-e2"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
