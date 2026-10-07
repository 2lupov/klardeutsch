import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const APP_NAME = "KLAR Academy";
const SLUG = "klar-academy";

function getMcpUrl() {
  const configured = import.meta.env.VITE_SUPABASE_URL as string;
  const u = new URL(configured);
  const authority = configured.match(/^https?:\/\/([^/?#]*)/i)?.[1];
  const loop = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i.test(authority ?? "");
  if (!authority || authority.includes("@") || configured.includes("?") || configured.includes("#") || (u.protocol === "http:" && !loop)) {
    throw new Error("Invalid VITE_SUPABASE_URL");
  }
  const legacy = u.hostname.endsWith(".lovable.cloud") && !u.hostname.startsWith("c--");
  const base = legacy ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : u.toString().replace(/\/+$/, "");
  return `${base}/functions/v1/mcp`;
}

function CopyBox({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
      <code className="flex-1 break-all text-sm text-foreground">{value}</code>
      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>
        {ok ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
    {items.map((s, i) => <li key={i}>{s}</li>)}
  </ol>
);

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">{children}</a>
);

export default function ConnectAgent() {
  const url = getMcpUrl();
  const cmd = `claude mcp add --scope user --transport http ${SLUG} '${url.replace(/'/g, "'\\''")}'`;
  const claudeLink = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(APP_NAME)}&connectorUrl=${encodeURIComponent(url)}`;

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto p-5 space-y-5 pb-16">
        <Link to="/profile" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-foreground backdrop-blur">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">KLAR mit deinem KI-Assistenten verbinden</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Dein Assistent kann deinen Fortschritt, deine gespeicherten Wörter und die Academy-Kurse lesen. Du meldest dich dabei mit deinem KLAR-Konto an.
          </p>
        </div>

        <Section title="Server-URL">
          <CopyBox value={url} />
        </Section>

        <h2 className="font-display text-xl font-bold text-foreground pt-2">Verbinden</h2>
        <Section title="ChatGPT">
          <Steps items={[
            <>Öffne <A href="https://chatgpt.com/#settings/Connectors/Advanced">Apps-Einstellungen</A> und aktiviere den Entwicklermodus (Hinweis beachten). Fehlt er, frag deinen ChatGPT-Admin.</>,
            <>Öffne den Dialog <A href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins">„Neues Plugin“</A>.</>,
            <>Name „{APP_NAME}“ und die URL oben einfügen.</>,
            "Details prüfen, „I understand and want to continue“ ankreuzen (erscheint bei jedem eigenen Server) und „Create“ klicken.",
            "App im Chat-Eingabefeld aktivieren und ChatGPT bitten, KLAR zu nutzen.",
          ]} />
        </Section>
        <Section title="Claude">
          <Steps items={[
            <>Öffne den <A href={claudeLink}>vorausgefüllten Connector-Dialog</A>.</>,
            "Details prüfen und „Add“ klicken.",
            "Öffnet sich das Formular nicht: Connectors → „Add custom connector“, Namen eingeben und URL einfügen.",
            "Connector im Chat aktivieren und Claude bitten, KLAR zu nutzen.",
          ]} />
        </Section>
        <Section title="Claude Code">
          <p className="text-sm text-muted-foreground">Im Terminal ausführen:</p>
          <CopyBox value={cmd} />
          <Steps items={[
            "Claude Code starten und /mcp ausführen, um die Verbindung zu prüfen – dort meldest du dich an.",
            "Claude Code bitten, KLAR zu nutzen.",
          ]} />
        </Section>
        <Section title="Andere MCP-Clients">
          <Steps items={[
            "MCP-Server- oder Connector-Einstellungen öffnen.",
            "Eine Remote-MCP-Verbindung anlegen.",
            "Benennen und die URL einfügen.",
            "Anmeldung abschließen.",
            "Verbindung aktivieren und den Assistenten bitten, KLAR zu nutzen.",
          ]} />
        </Section>

        <h2 className="font-display text-xl font-bold text-foreground pt-2">Nach Updates aktualisieren</h2>
        <Section title="ChatGPT">
          <Steps items={[
            "Plugins-Seite öffnen und diese App wählen.",
            "Bis „Information“ scrollen und „Refresh“ klicken.",
            "Hat sich die URL geändert: App löschen und oben neu verbinden.",
            "Neuen Chat starten.",
          ]} />
        </Section>
        <Section title="Claude">
          <Steps items={[
            "Connectors-Seite öffnen und diesen Connector wählen.",
            "Tools aktualisieren.",
            "Hat sich die URL geändert: Connector entfernen und neu verbinden.",
            "Claude bitten, KLAR zu nutzen.",
          ]} />
        </Section>
        <Section title="Claude Code">
          <Steps items={[
            "Neue Claude-Code-Sitzung starten – die neuesten Tools werden geladen.",
            <>Hat sich die URL geändert: <code>claude mcp remove {SLUG}</code> ausführen und den Befehl oben erneut.</>,
            "Claude Code bitten, KLAR zu nutzen.",
          ]} />
        </Section>
        <Section title="Andere MCP-Clients">
          <Steps items={[
            "MCP-Einstellungen öffnen und die KLAR-Verbindung wählen.",
            "Tool-Liste aktualisieren, Server neu laden oder neu verbinden.",
            "Bei geänderter URL die neue URL einfügen.",
            "Neuen Chat oder neue Sitzung starten.",
          ]} />
        </Section>
      </div>
    </div>
  );
}
