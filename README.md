# Modern Discord Music Bot

This is a Discord bot built with `Node.js` and `discord.js` that enables hybrid playback of local audio files and online sources like YouTube and Spotify. It features a robust queue, advanced playback controls, and a flexible search function.

## Features

- Hybrid Playback: Searches for songs locally first, then on YouTube.
- Direct playback of YouTube links.
- Loads and plays entire Spotify playlists and albums (by searching for the songs on YouTube).
- Full playback control: Play, Pause, Resume, Skip, Leave.
- Comprehensive queue management: View, clear, and shuffle the queue.
- Export function to download songs directly in the chat.
- Display of all available local songs and the currently playing track.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 16.9.0 or newer recommended)
- **FFmpeg**: You must have the FFmpeg and ffprobe executables.
- A Discord account and a server where you have administrative rights.
- A Discord Bot Token (created in the [Discord Developer Portal](https://discord.com/developers/applications)).

## Installation & Setup

1.  **Download the Project:**
    Clone the repository or download the files into a new folder.

2.  **Set up FFmpeg:**
    The bot requires FFmpeg for audio processing.
    - Create a new folder named `bin` in the root of your project directory.
    - Download the FFmpeg executables for your operating system from the official [FFmpeg website](https://ffmpeg.org/download.html).
    - From the downloaded files, find the `ffmpeg` and `ffprobe` executables (e.g., `ffmpeg.exe` and `ffprobe.exe` on Windows).
    - Place these two executable files directly inside the `./bin` folder you created.

3.  **Install Dependencies:**
    Open a terminal in your project folder and run the following command to install all necessary Node.js packages:
    ```bash
    npm install
    ```
    This will install all dependencies listed in `package.json`, such as `discord.js`, `@discordjs/voice`, `play-dl`, and `@distube/ytdl-core`.

4.  **Create `.env` File:**
    In the main directory of your project, create a file named exactly `.env`. Add your bot token to this file.
    ```
    TOKEN=YOUR_SECRET_DISCORD_BOT_TOKEN_HERE
    ```

5.  **Create `music` & `downloads` Folders:**
    In the main directory, create two folders:
    - `music`: Place all `.mp3` files here that the bot should find locally.
    - `downloads`: This folder is used for temporary downloads, for example by the `!export` command.
    These folders are ignored by Git, as specified in the `.gitignore` file.

## Spotify Setup (One-Time Authorization)

To reliably play Spotify playlists and albums, `play-dl` needs to be authorized with your Spotify account once. This is a more secure method than storing secret keys.

1.  **Find the Authorization Script:**
    The `play-dl` package includes an authorization script. You can find it inside your `node_modules` folder at this path: `node_modules/play-dl/dist/scripts/authorize.js`.

2.  **Run the Script:**
    Open a terminal in the **root directory of your project** and run the script using `node`:
    ```bash
    node node_modules/play-dl/dist/scripts/authorize.js
    ```

3.  **Follow the Instructions in the Terminal:**
    - The script will ask for your **Spotify Client ID** and **Client Secret**. You can get these by creating a new app in your [Spotify for Developers Dashboard](https://developer.spotify.com/dashboard).
    - It will also ask for a **Redirect URI**. You can use `http://127.0.0.1/` for this. Make sure to add this exact URI in your Spotify App's settings on the developer dashboard.
    - The script will then generate a URL. Copy this URL and paste it into your web browser.
    - Log in to Spotify and grant the permissions. You will be redirected to the URI you entered (e.g., `http://127.0.0.1/`).
    - Copy the **entire URL** from your browser's address bar after being redirected. It will contain a `?code=...` parameter.
    - Paste this full redirected URL back into the terminal.

4.  **Result: The `.data` Folder:**
    After a successful authorization, the script will automatically create a folder named `.data` in your project's root directory. This folder contains your secure refresh tokens.
    **Do not delete this folder.** It is correctly listed in your `.gitignore` file to ensure these sensitive tokens are never uploaded to GitHub.

## Starting the Bot

Open a terminal in your project folder and run the following command:

```bash
node index.js
```
If everything is set up correctly, the console should display the message `Bot ist online! Eingeloggt als YourBotName#1234`, and the bot will appear online in your Discord server.

## Command Overview

All commands must start with an exclamation mark (`!`).

### Playback & Control

-   **`!play <song_name | link>`**: The core command for playback. It first searches for a matching song locally. If none is found, it starts a search on YouTube. It also accepts direct YouTube or Spotify links (tracks, playlists, albums).
-   **`!all`**: Adds all `.mp3` files from the `music` folder to the queue and starts playback.
-   **`!pause`**: Pauses the current playback.
-   **`!resume`**: Resumes a paused playback.
-   **`!skip`**: Skips the current song. If there is another song in the queue, it will start playing.
-   **`!leave`**: Disconnects the bot from the voice channel, stops the music, and clears the queue.

### Queue Management

-   **`!queue`**: Displays the current song queue in a clean, numbered list.
-   **`!clear`**: Removes all pending songs from the queue.
-   **`!shuffle`**: Randomly shuffles the order of the songs in the queue.

### Information & Tools

-   **`!current`**: Displays the title of the currently playing song.
-   **`!showall`**: Shows a list of all available `.mp3` files in the `music` folder.
-   **`!export <song_name | "current">`**: Sends the specified song (local or from YouTube) as an `.mp3` file directly into the chat for download.
-   **`!help`**: Displays a help message with all available commands.

## How Playback Works

The bot uses a hybrid search strategy and an object-based queue.
1.  **Search:** For `!play <title>`, it first checks if a matching local file exists in the `music` folder. Only if this fails, a search is initiated on YouTube.
2.  **Links:** Direct YouTube and Spotify links are detected and processed by `play-dl`. For Spotify, song metadata is used to find the corresponding songs on YouTube.
3.  **Queue:** Each song is stored as an object in the queue with a type (`local` or `youtube`), title, and path/URL.
4.  **Playback:** The bot's `Idle` handler checks the type of the next song and uses either a local file path or a YouTube stream (via `@distube/ytdl-core`) to play the music.