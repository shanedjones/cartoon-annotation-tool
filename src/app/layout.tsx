import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppStateProvider } from '@/state';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cartoon Annotation Tool',
  description: 'Tool for annotating cartoon videos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppStateProvider>
          {children}
        </AppStateProvider>
        <Script id="dev-tools-init">
          {`
            if (process.env.NODE_ENV !== 'production') {
              try {
                const { initializeDevTools } = require('@/state');
                initializeDevTools();
              } catch (e) {
                console.error("Failed to initialize DevTools:", e);
              }
            }
          `}
        </Script>
      </body>
    </html>
  );
}