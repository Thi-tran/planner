import type { Metadata } from "next";
import "./globals.css";
import StyledComponentsRegistry from "./registry";
import ProjectContextProvider from "@/components/ProjectContextProvider";

export const metadata: Metadata = {
  title: "Planning Reminder",
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
        <StyledComponentsRegistry>
          <ProjectContextProvider>
            {children}
          </ProjectContextProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
