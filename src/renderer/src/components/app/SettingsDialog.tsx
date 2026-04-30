import { useEffect, useState, type ReactNode } from "react";
import { Database, Languages, Monitor, Moon, Palette, Plug, Sliders, Sun } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { ConnectionsSection } from "@/components/app/ConnectionsSection";
import { DialogSection } from "@/components/app/DialogSection";
import { SchemasSection } from "@/components/app/SchemasSection";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useLocale, type Locale } from "@/lib/i18n";

type TabId = "general" | "connections" | "schemas";

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [tab, setTab] = useState<TabId>("general");

  // Reset to General every time the dialog opens — coming back to the
  // last-selected tab feels surprising when the user expects the calm
  // appearance/language landing surface.
  useEffect(() => {
    if (open) setTab("general");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader
        title={t("preferences.title")}
        description={t("preferences.description")}
        onClose={() => onOpenChange(false)}
      />
      <div className="border-b border-border px-5 py-3">
        <Segmented<TabId>
          value={tab}
          onChange={setTab}
          className="w-full justify-stretch [&>button]:flex-1"
          options={[
            {
              value: "general",
              label: (
                <>
                  <Sliders className="h-3.5 w-3.5" /> {t("preferences.tabGeneral")}
                </>
              ),
            },
            {
              value: "connections",
              label: (
                <>
                  <Plug className="h-3.5 w-3.5" /> {t("preferences.tabConnections")}
                </>
              ),
            },
            {
              value: "schemas",
              label: (
                <>
                  <Database className="h-3.5 w-3.5" /> {t("preferences.tabSchemas")}
                </>
              ),
            },
          ]}
        />
      </div>
      <DialogBody>
        {/*
          All three panels stay mounted; toggling `tab` only flips visibility.
          That way Connections/Schemas keep their in-flight form state when
          the user clicks between tabs, and config fetches happen once per
          dialog open instead of on every tab switch.
        */}
        <TabPanel id="general" active={tab}>
          <DialogSection
            icon={<Palette className="h-4 w-4 text-primary" />}
            title={t("preferences.appearance")}
            description={t("preferences.appearanceDescription")}
          >
            <Segmented<ThemeMode>
              value={mode}
              onChange={setMode}
              className="w-full justify-stretch [&>button]:flex-1"
              options={[
                {
                  value: "light",
                  label: (
                    <>
                      <Sun className="h-3.5 w-3.5" /> {t("preferences.themeLight")}
                    </>
                  ),
                },
                {
                  value: "dark",
                  label: (
                    <>
                      <Moon className="h-3.5 w-3.5" /> {t("preferences.themeDark")}
                    </>
                  ),
                },
                {
                  value: "system",
                  label: (
                    <>
                      <Monitor className="h-3.5 w-3.5" /> {t("preferences.themeSystem")}
                    </>
                  ),
                },
              ]}
            />
          </DialogSection>

          <DialogSection
            icon={<Languages className="h-4 w-4 text-primary" />}
            title={t("preferences.language")}
            description={t("preferences.languageDescription")}
          >
            <Segmented<Locale>
              value={locale}
              onChange={setLocale}
              className="w-full justify-stretch [&>button]:flex-1"
              options={[
                { value: "en", label: t("preferences.languageEnglish") },
                { value: "es", label: t("preferences.languageSpanish") },
              ]}
            />
          </DialogSection>
        </TabPanel>

        <TabPanel id="connections" active={tab}>
          <ConnectionsSection active={open} />
        </TabPanel>

        <TabPanel id="schemas" active={tab}>
          <SchemasSection active={open} />
        </TabPanel>
      </DialogBody>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>{t("preferences.done")}</Button>
      </DialogFooter>
    </Dialog>
  );
}

function TabPanel({
  id,
  active,
  children,
}: {
  id: TabId;
  active: TabId;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      hidden={id !== active}
      className={cn("flex-col gap-5", id === active ? "flex" : "hidden")}
    >
      {children}
    </div>
  );
}
