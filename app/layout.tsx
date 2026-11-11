import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Forte CMS", template: "%s · Forte CMS" }, description: "Multi-tenant content management" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
