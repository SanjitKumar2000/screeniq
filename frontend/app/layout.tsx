import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "ScreenIQ",
  description: "AI-powered candidate screener",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <a href="/" className="text-lg font-semibold">
                ScreenIQ
              </a>
              <nav className="flex gap-4 text-sm">
                <a href="/screen" className="hover:underline">
                  Screen
                </a>
                <a href="/dashboard" className="hover:underline">
                  Dashboard
                </a>
                <a href="/login" className="hover:underline">
                  Login
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
