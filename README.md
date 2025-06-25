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
Follow the authorization-instructions in the [play-dl-documentary](https://play-dl.github.io/modules.html).

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