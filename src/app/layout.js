import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { NotificationProvider } from "@/lib/notification-context";
import { ToastProvider } from "@/components/Toast";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Nongkame888 POS - ระบบบริหารจัดการร้านแฟชั่นและจุดขายสินค้า",
  description: "ระบบ POS และจัดการสต็อก ออเดอร์ รายงาน ยอดขาย ครบวงจร เชื่อมต่อ Supabase Real-time",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <Navbar />
                  <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {children}
                  </main>
                </div>
              </ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
