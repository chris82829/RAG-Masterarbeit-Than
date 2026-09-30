# Herkunft und Übernahme

Übernommen am 30.09.2026 von `ifaiforschung.informatik.fh-nuernberg.de`:

- Anwendungsquellen: `/var/sftp/uploads/app`.
- Ausgangsrevision als Herkunftshinweis: `c512cdd87ec6801e5642a77f381103b3c14f02d5`, datiert auf den 28.01.2026. Es wurde der tatsächliche Dateistand inklusive lokaler Änderungen übernommen.
- Ergänzende Start- und Datenbankdateien: `/var/sftp/uploads/docker-compose.yml`, `ecosystem.config.js` und `containers/db/`.
- Keine Übernahme des alten `.git`-Verzeichnisses, seiner Historie oder seiner Remote-Konfiguration. Dieses Repository startet mit einem neuen Initial-Commit.

## Abgrenzung zur aktuellen Webseite

Nginx leitet HTTPS an den Container `jobby-v3-prod-app` weiter. Dieser verwendet `ghcr.io/phtngyn/jobby-v3-app:latest`. Das Docker-Image enthält unter `/app/.output` den kompilierten Nuxt-Stand; seine Source Maps enthalten keine eingebetteten Originalquellen. Das Image verweist auf `phtngyn/jobby-v3`, auf das beim Import kein Lesezugriff bestand.

Die Januar-Quellen dieses Repositories sind vollständig bearbeitbare Dateien des vorgefundenen älteren Projekts. Es wird keine Gleichheit mit dem aktuellen v3-Produktivsystem behauptet. Es wurden keine v3-Funktionen durch Rückübersetzung erfunden und keine kompilierten Dateien als Originalquellcode ausgegeben.

## Anpassungen für das unabhängige Projekt

- Paketname auf `rag-masterarbeit-than` geändert und einen Startbefehl ergänzt.
- Fest eingetragenes Datenbankpasswort durch `.env`-Variablen ersetzt; `.env.example` enthält ausschließlich Platzhalter.
- PM2-Konfiguration nach `ecosystem.config.cjs` umbenannt und absolute Serverpfade durch projektbezogene Pfade ersetzt.
- Zwingende Einbindung des nicht veröffentlichten Datenbank-Dumps entfernt. Datenbank-Restore ist ein manueller, optionaler Schritt.
- Datenbank-Initialisierung für die im Schema genutzten Erweiterungen ergänzt, eine fehlerhafte Dockerfile-Zeilenfortsetzung korrigiert und den Shared-Buffer-Wert an das vorhandene Container-Speicherlimit angepasst.
- Lokale Container-Ports an `127.0.0.1` gebunden und Ausschlussregeln für Secrets, Dumps und Modellgewichte ergänzt.

Die fachlichen Vue-/TypeScript-Quelldateien wurden mit dem Serverstand abgeglichen. Ein vorhandener Typfehler wurde korrigiert: In `shared/constants.ts` erhält der Standardfilter das bereits vom Schema verlangte Feld `excludes: []`. In `server/lib/db/query.ts` wurden zusätzlich sieben nachgestellte Leerzeichen entfernt; die übrigen Anwendungsdateien sind unverändert. Die mitgelieferten JSON-Dateien unter `server/eval/` sind vorhandene Evaluationsartefakte des Quellstands; Ergebnisse wurden nicht neu berechnet.

## Nicht enthalten

Produktive Umgebungsvariablen, Schlüssel, Passwörter, Datenbankinhalte, Benutzer- und Chatdaten, Modellgewichte, Abhängigkeiten unter `node_modules`, generierte Build-Verzeichnisse und alte Git-Metadaten.

## Validierung

Geprüft mit Node.js 24.19.0 und pnpm 10.28.2:

- `pnpm install --frozen-lockfile`: erfolgreich, Lockfile unverändert übernommen.
- `pnpm build`: erfolgreich, einschließlich erneutem Build nach der Typkorrektur.
- `pnpm typecheck`: erfolgreich nach Ergänzung von `excludes: []`.
- `docker compose --env-file .env.example config --quiet`: erfolgreich.
- Syntaxprüfung des Restore-Skripts und der PM2-Konfiguration: erfolgreich.
- `git diff --cached --check`: erfolgreich.
- 88 Anwendungsdateien mit dem Serverexport abgeglichen: ausschließlich die zwei oben beschriebenen, dokumentierten Änderungen.
- 106 versionierte Dateien; Prüfung auf bekannte Server-Zugangsdaten und typische Schlüsselmuster ohne Treffer. Keine `.env`, Datenbank-Dumps, Modellgewichte oder alte Git-Historie enthalten.

Ein vollständiger RAG-End-to-End-Test wurde nicht durchgeführt: Auf dem lokalen Rechner war Docker nicht gestartet; eigene Zugangsdaten, Modelle und Stellen-Daten wurden nicht eingerichtet. Der laufende Hochschulserver wurde ausschließlich gelesen und nicht neu gestartet oder verändert.
