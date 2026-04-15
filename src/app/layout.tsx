import type { Metadata } from 'next';
import Web3Provider from '@/components/Web3Provider';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/layout/Navbar';
import PixelLandscape from '@/components/layout/PixelLandscape';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wizper',
  description: 'A Web3 anonymous confession platform. Express your emotions, mint them as NFTs, and form magical connections — all protected by Zero-Knowledge Proofs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-wizard-dark text-gray-200 antialiased overflow-x-hidden">
        <Web3Provider>
          <ThemeProvider>
            <AppProvider>
              <PixelLandscape />
              <Navbar />
              <main className="relative z-10 pt-14">
                {children}
              </main>
            </AppProvider>
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
