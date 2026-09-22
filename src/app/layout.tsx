import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { AddFlowProvider } from "@/components/add-flow";
import { AppFrame } from "@/components/app-frame";
import { BootSplash } from "@/components/boot-splash";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lately",
  description: "日々の記録",
  applicationName: "Lately",
  appleWebApp: {
    capable: true,
    title: "Lately",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#E8DFD0",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html lang="ja" className={`${fraunces.variable} ${nunito.variable} h-full w-full antialiased`}>
      <body className="min-h-full w-full bg-[#E8DFD0] text-[#2F2A24]">
        <BootSplash />
        <AddFlowProvider loggedIn={Boolean(user)}>
          <AppFrame loggedIn={Boolean(user)}>{children}</AppFrame>
        </AddFlowProvider>
      </body>
    </html>
  );
}
