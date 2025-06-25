// test-playlist.js
require('dotenv').config();
const play = require('play-dl');

(async () => {
    try {
        await play.setToken({
            spotify: {
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET,
                refresh_token: null, market: 'DE'
            }
        });
        await play.refreshToken();
        console.log('[TEST] Spotify-Authentifizierung erfolgreich.');

        const playlistUrl = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
        console.log(`[TEST] Rufe Playlist-Infos für ${playlistUrl} ab...`);
        
        const playlist = await play.spotify(playlistUrl);
        console.log(typeof(playlist));
        console.log(`[SUCCESS] Test erfolgreich! Playlist: ${playlist.name}`);

    } catch (error) {
        console.error('[FAIL] Der isolierte Playlist-Test ist fehlgeschlagen:', error);
    }
})();