import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/auth-provider";

export const metadata: Metadata = {
  title: "Commonplace — good times, clear tabs",
  description: "Share plans, expenses, and balances with your favorite people.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
