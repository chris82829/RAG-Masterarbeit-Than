# RAG-Masterarbeit-Than

Bearbeitbarer Nuxt-/Vue-/TypeScript-Quellcode, am 30.09.2026 vom Hochschulserver übernommen. Dieses Repository besitzt eine neue, unabhängige Git-Historie.

**Versionsstand:** Die Quelldateien stammen aus `/var/sftp/uploads/app` und basieren auf dem Stand vom 28.01.2026, einschließlich der dort vorhandenen lokalen Änderungen. Die aktuell unter `https://ifaiforschung.informatik.fh-nuernberg.de/` laufende Anwendung ist **Jobby v3**. Deren vollständiger Originalquellcode liegt dort nicht vor; dieses Repository ist daher **kein identischer Quellcode-Stand der aktuellen v3-Webseite**. Details: [IMPORT.md](IMPORT.md).

## Bearbeiten und bauen

Voraussetzungen: Node.js 22 oder neuer und pnpm 10.28.2 (Version aus dem übernommenen Projekt).

```sh
git clone https://github.com/chris82829/RAG-Masterarbeit-Than.git
cd RAG-Masterarbeit-Than
cp .env.example .env
pnpm install --frozen-lockfile
pnpm build
```

Frontend: `app/pages`, `app/components`, `app/composables`. Backend und Suchlogik: `server/api`, `server/lib`, `server/utils`. Datenbankschema: `server/lib/db/schema`. Gemeinsame Typen: `shared`.

## Lokal starten

1. In `.env` einen eigenen Google-API-Key, einen zufälligen Session-Schlüssel mit mindestens 32 Zeichen und eigene lokale Datenbank-Zugangsdaten eintragen. `DATABASE_URL` muss mit `DB_NAME`, `DB_USER` und `DB_PASSWORD` übereinstimmen. Sonderzeichen im URL-Passwort URL-kodieren.
2. Docker starten und mit `docker compose up -d db` die lokale PostgreSQL-/ParadeDB-Instanz anlegen. Nach erfolgreichem Start mit `pnpm db:push` das Schema erstellen. Der Import wurde ohne Produktivdaten übernommen; die Datenbank ist zunächst leer.
3. Für die Suche die beiden zum Quellstand gehörenden Modelldateien unter `models/` bereitstellen: `jina-embeddings-v3-Q8_0.gguf` und `bge-reranker-v2-m3-Q4_K_M.gguf`. Danach `docker compose up -d embedding_server reranker_server` ausführen. Die Modelldateien sind nicht in Git enthalten.
4. `pnpm dev` startet die Anwendung. Die Suchdienste werden auf `localhost:8000` und `localhost:8001` erwartet; Datenbank und Suchdienste sind nur an die lokale Netzwerkschnittstelle gebunden.

Für den gebauten Stand: `pnpm build`, anschließend `pnpm start`. Optional kann PM2 mit `pm2 start ecosystem.config.cjs` verwendet werden. Ein eigener Datenbank-Dump lässt sich ausdrücklich und manuell mit `bash containers/db/restore_dump.sh /pfad/zur/datei.dump` in die lokale Datenbank laden.

Ohne Google-Key, Modelle und befüllte Datenbank ist keine vollständige RAG-Suche möglich. `.env`, Passwörter, Benutzer-/Chatdaten, Datenbank-Dumps, Modellgewichte und generierte Build-Dateien werden nicht versioniert.

## Prüfungen

Siehe [IMPORT.md](IMPORT.md) für die bei der Übernahme durchgeführten Prüfungen und deren Grenzen.
