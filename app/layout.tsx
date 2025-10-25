import { Open_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const _openSans = Open_Sans({ subsets: ["latin"] });

export const metadata = {
  title: "IdolGuessr Dashboard",
  description: "Dashboard for managing IdolGuessr content and submissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${_openSans.className} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
