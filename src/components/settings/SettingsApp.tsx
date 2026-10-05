"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AiSettings, Preset } from "@/content/ai";
import type { FontId } from "@/content/fonts";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { AddExamplesButton } from "@/components/examples/AddExamplesButton";
import { CatalogProvider } from "./catalog";
import { FontsSection } from "./FontsSection";
import { LibrarySection } from "./LibrarySection";
import { PresetsSection } from "./PresetsSection";
import { ProvidersSection } from "./ProvidersSection";
import { Section } from "./Section";
import { TokenSection } from "./TokenSection";

export type SettingsInitial = {
  ai: AiSettings;
  builtinPresets: Preset[];
  fonts: FontId[];
  language: string;
  openrouter: { set: boolean; last4: string | null };
  token: { set: boolean };
};

const NAV = [
  ["providers", "Providers"],
  ["models", "Models & presets"],
  ["library", "Model library"],
  ["fonts", "Fonts"],
  ["language", "Language"],
  ["authoring", "Authoring access"],
  ["examples", "Examples"],
] as const;

export function SettingsApp({ initial, email }: { initial: SettingsInitial; email: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [ai, setAi] = useState(initial.ai);
  const [fonts, setFonts] = useState(initial.fonts);
  const [language, setLanguage] = useState(initial.language);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const dirty = JSON.stringify(ai) !== JSON.stringify(saved.ai) || fonts.join() !== saved.fonts.join() || language !== saved.language;

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const next = await api<SettingsInitial>("/api/settings", { method: "PUT", body: { ai, fonts, language } });
      setSaved(next);
      setAi(next.ai);
      setFonts(next.fonts);
      setLanguage(next.language);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const discard = () => {
    setAi(saved.ai);
    setFonts(saved.fonts);
    setLanguage(saved.language);
  };

  return (
    <CatalogProvider>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-40 pt-10 sm:px-8 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-8 space-y-1 font-ui text-[13.5px]">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-muted transition hover:bg-border/40 hover:text-text">
                {label}
              </a>
            ))}
          </div>
        </nav>
        <main className="min-w-0 space-y-16">
          <header>
            <h1 className="font-[family-name:var(--font-newsreader)] text-[40px] tracking-tight">Settings</h1>
            <p className="mt-2 font-ui text-[14px] text-muted">Signed in as {email}</p>
          </header>

          <Section id="providers" title="Providers" intro="Where the writing comes from. Sign each one in once; the sign-in is kept on this server.">
            <ProvidersSection openrouter={initial.openrouter} />
          </Section>

          <Section
            id="models"
            title="Models & presets"
            intro="Choose a model and effort for each kind of work, and a backup to try if it fails. Save combinations as presets and switch between them."
          >
            <PresetsSection ai={ai} builtins={initial.builtinPresets} onChange={setAi} />
          </Section>

          <Section id="library" title="Model library" intro="Pick the models you want to choose from. Only these appear in the pickers above.">
            <LibrarySection ai={ai} onChange={setAi} />
          </Section>

          <Section id="fonts" title="Fonts" intro="Each new course picks its look from the fonts you switch on. Courses using a font you switch off move to your first choice.">
            <FontsSection fonts={fonts} onChange={setFonts} />
          </Section>

          <Section id="language" title="Language" intro="Leave empty to write each course in the language you ask in.">
            <div className="max-w-xs">
              <Label htmlFor="lang" hint="e.g. en, ru, de">
                Course language
              </Label>
              <Input id="lang" placeholder="Match my request" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
          </Section>

          <Section
            id="authoring"
            title="Authoring access"
            intro="A personal token that lets Claude Code (in your terminal) write a course and add it here directly."
          >
            <TokenSection initiallySet={initial.token.set} />
          </Section>

          <Section id="examples" title="Example courses" intro="Ready-made courses that show what Easy Learn can do. Their remaining lessons are written on demand.">
            <AddExamplesButton />
          </Section>
        </main>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 font-ui text-[13px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)]">
            <span className="text-muted">{error ?? "Unsaved changes"}</span>
            <Button size="sm" variant="ghost" onClick={discard}>
              Discard
            </Button>
            <Button size="sm" onClick={save} loading={busy}>
              Save
            </Button>
          </div>
        </div>
      )}
    </CatalogProvider>
  );
}
