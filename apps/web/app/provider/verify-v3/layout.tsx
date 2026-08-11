import type { ReactNode } from "react";
import "@/app/admin/admin.css";
import { PREFERENCE_DEFAULTS } from "@/lib/admin/preferences/preferences-config";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { Toaster } from "@/components/admin/ui/sonner";

export default function VerifyV3Layout({
  children,
}: {
  children: ReactNode;
}) {
  const { theme_mode, theme_preset, content_layout, navbar_style, font } = PREFERENCE_DEFAULTS;

  return (
    <div className="admin-body min-h-screen">
      <PreferencesStoreProvider
        themeMode={theme_mode}
        themePreset={theme_preset}
        contentLayout={content_layout}
        navbarStyle={navbar_style}
        font={font}
      >
        {children}
        <Toaster />
      </PreferencesStoreProvider>
    </div>
  );
}
