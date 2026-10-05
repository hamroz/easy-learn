import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { themeClass, themeStyle } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Easy Learn", template: "%s · Easy Learn" },
  description: "Learn anything, calmly — interactive lessons written for you.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

/** Apply the saved colour scheme before first paint to avoid a flash. */
const schemeScript = `try{var s=localStorage.getItem("el-scheme");if(s==="light"||s==="dark")document.documentElement.dataset.scheme=s}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: schemeScript }} />
      </head>
      <body className={`${themeClass(null)} min-h-screen`} style={themeStyle(null)}>
        {children}
      </body>
    </html>
  );
}
