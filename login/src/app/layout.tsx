import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import type { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enterprise Portal - Secure Access',
  description: 'Modern enterprise login portal with glassmorphism design',
  keywords: ['login', 'authentication', 'enterprise', 'security'],
  authors: [{ name: 'Enterprise Development Team' }],
  viewport: 'width=device-width, initial-scale=1.0',
  robots: 'noindex, nofollow', // For enterprise security
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <link
          href='https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
          rel='stylesheet'
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
        <ToastContainer
          position='top-right'
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme='light'
          toastClassName='backdrop-blur-sm'
        />
      </body>
    </html>
  );
}
