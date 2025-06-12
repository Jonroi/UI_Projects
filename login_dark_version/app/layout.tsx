import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Enterprise Portal - Secure Access',
  description:
    'Modern dark theme enterprise login system with advanced security features',
  keywords: ['login', 'authentication', 'enterprise', 'security', 'dark theme'],
  authors: [{ name: 'Enterprise Portal' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0f172a',
  robots: 'noindex, nofollow',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='dark'>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className='relative min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800'>
          {/* Background pattern */}
          <div
            className='absolute inset-0 opacity-20'
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>

          {/* Main content */}
          <main className='relative z-10'>{children}</main>

          {/* Toast notifications */}
          <Toaster
            position='top-center'
            reverseOrder={false}
            gutter={8}
            containerClassName=''
            containerStyle={{}}
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(30, 41, 59, 0.95)',
                color: '#ffffff',
                border: '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                fontSize: '14px',
                fontWeight: '500',
                padding: '16px 20px',
                maxWidth: '400px',
                boxShadow:
                  '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
              },
              success: {
                style: {
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                },
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                style: {
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </body>
    </html>
  );
}
