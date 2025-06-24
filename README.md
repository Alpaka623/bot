# Einfacher Discord Musik-Bot

Dies ist ein einfacher, mit `Node.js` und `discord.js` erstellter Discord-Bot, der Sprachkanälen beitreten und lokale Audiodateien aus einem Verzeichnis abspielen kann. Er verfügt über eine grundlegende Warteschlange (Queue), Wiedergabesteuerung und weitere Befehle.

## Features

- Beitritt zu und Verlassen von Sprachkanälen
- Abspielen von lokalen `.mp3`-Dateien
- Eine einfache Song-Warteschlange, die auch gemischt und geleert werden kann
- Pausieren und Fortsetzen der Wiedergabe
- Überspringen des aktuellen Songs
- Automatisches Abspielen aller Songs aus dem Musik-Ordner
- Exportieren von Songs direkt in den Chat
- Anzeige aller verfügbaren und aktuell gespielten Lieder

## Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 16.9.0 oder neuer empfohlen)
- Ein Discord-Account und ein Server, auf dem du Administratorrechte hast
- Ein Discord Bot-Token (erstellt im [Discord Developer Portal](https://discord.com/developers/applications))

## Installation & Setup

Folge diesen Schritten, um den Bot auf deinem eigenen System zum Laufen zu bringen:

1.  **Projekt herunterladen:**
    Lade die `index.js`-Datei und andere Projektdateien herunter und speichere sie in einem neuen Ordner.

2.  **Abhängigkeiten installieren:**
    Öffne ein Terminal in deinem Projektordner und führe den folgenden Befehl aus, um alle notwendigen Pakete zu installieren:
    ```bash
    npm install discord.js @discordjs/voice dotenv ffmpeg-static libsodium-wrappers @discordjs/opus
    ```
    Dies installiert alle in der `package.json` aufgeführten Abhängigkeiten.

3.  **`.env`-Datei erstellen:**
    Erstelle im Hauptverzeichnis deines Projekts eine Datei mit dem exakten Namen `.env` und füge deinen Bot-Token wie folgt ein:
    ```
    TOKEN=DEIN_GEHEIMER_DISCORD_BOT_TOKEN_HIER
    ```
    Diese Datei wird von der Versionskontrolle ignoriert, wie in `.gitignore` festgelegt.

4.  **Musik-Ordner anlegen:**
    Erstelle im Hauptverzeichnis einen Ordner mit dem Namen `music`. Lege hier alle `.mp3`-Dateien ab, die der Bot abspielen soll. Dieser Ordner wird ebenfalls von Git ignoriert.

## Bot zum Server einladen

1.  Gehe zum [Discord Developer Portal](https://discord.com/developers/applications) und wähle deine Anwendung aus.
2.  Gehe zum "OAuth2" -> "URL Generator" Tab.
3.  Wähle die Scopes `bot` und `applications.commands`.
4.  Wähle die folgenden **Bot Permissions** aus:
    - `Send Messages`
    - `Read Message History`
    - `Connect`
    - `Speak`
5.  Kopiere die generierte URL, füge sie in deinen Browser ein und lade den Bot auf deinen Server ein.

## Bot starten

Öffne ein Terminal in deinem Projektordner und führe folgenden Befehl aus:

```bash
node index.js
```
Wenn alles korrekt eingerichtet ist, sollte in der Konsole die Nachricht `Bot ist online! Eingeloggt als DeinBotName#1234` erscheinen und der Bot wird in deinem Discord-Server als online angezeigt.

## Befehlsübersicht

Alle Befehle müssen mit einem Ausrufezeichen (`!`) beginnen.

`!help`
Zeigt eine Hilfsnachricht mit allen verfügbaren Befehlen an.

`!play <Liedname>`
Spielt einen bestimmten Song aus dem `music`-Ordner ab. Wenn bereits ein Lied läuft, wird der angeforderte Song zur Warteschlange hinzugefügt. Der `<Liedname>` muss ohne die `.mp3`-Dateiendung angegeben werden.
*Beispiel:* `!play mein lieblingslied`

`!all`
Liest alle `.mp3`-Dateien aus dem `music`-Ordner, fügt sie zur Warteschlange hinzu und startet die Wiedergabe.

`!pause`
Pausiert die aktuelle Wiedergabe.

`!resume`
Setzt eine pausierte Wiedergabe fort.

`!skip`
Überspringt den aktuellen Song. Ist ein weiterer Song in der Warteschlange, wird dieser gestartet.

`!leave`
Trennt die Verbindung des Bots zum Sprachkanal und leert die Warteschlange.

`!queue`
Zeigt die aktuelle Song-Warteschlange in einer übersichtlichen Liste an.

`!clear`
Entfernt alle Songs aus der Warteschlange.

`!shuffle`
Mischt die Reihenfolge der Songs in der Warteschlange zufällig.

`!current`
Zeigt den Titel des aktuell laufenden Songs an.

`!showall`
Zeigt eine Liste aller verfügbaren `.mp3`-Dateien im `music`-Ordner an.

`!export <Liedname|current>`
Sendet die angegebene `.mp3`-Datei direkt in den Chat zum Herunterladen. Mit `current` kann der aktuell gespielte Song exportiert werden.

## Funktionsweise der Warteschlange

Der Bot verwaltet eine einfache Liste (Warteschlange) von Songs.
- Mit `!play` oder `!all` werden Songs zur Warteschlange hinzugefügt.
- Sobald ein Lied beendet ist, schaut der Bot automatisch nach, ob ein weiteres Lied in der Warteschlange wartet und spielt dieses ab.
- Ist die Warteschlange leer, gibt der Bot eine Nachricht aus und verlässt den Kanal nach 60 Sekunden automatisch.
- Mit `!shuffle` kann die Reihenfolge der Warteschlange gemischt und mit `!clear` komplett geleert werden.