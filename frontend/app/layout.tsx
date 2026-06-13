import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "./registry";

export const metadata: Metadata = {
  title: "Planner",
  description: "Calendar planner app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0, padding: 0, height: "100%" }} suppressHydrationWarning>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  );
}
