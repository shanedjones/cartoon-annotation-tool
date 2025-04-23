import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/src/contexts/AppProviders";
import { Navbar } from "@/src/components/Navbar";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Golf Swing Analysis Tool",
  description: "Interactive tool for analyzing and annotating golf swing videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary name="RootLayout" fallback={
          <div className="container mx-auto p-4 max-w-7xl">
            <div className="p-6 bg-red-50 border border-red-200 rounded-md shadow-md">
              <h2 className="text-xl font-bold text-red-800 mb-4">Application Error</h2>
              <p className="text-red-600 mb-4">
                We encountered an unexpected error in the application. Please try refreshing the page.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        }>
          <AppProviders>
            <Navbar />
            <main className="container mx-auto p-4 max-w-7xl">
              {children}
            </main>
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}