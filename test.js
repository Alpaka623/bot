// test-stream.js
const play = require('play-dl');

(async () => {
    try {
        // Wir nehmen wieder eine URL, die garantiert funktioniert
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        console.log(`[STREAM TEST] Starte Test mit URL: ${testUrl}`);

        // Jetzt testen wir die stream() Funktion direkt
        const stream = await play.stream(testUrl);

        console.log('[SUCCESS] play.stream() war erfolgreich!');
        console.log('Informationen zum erhaltenen Stream:');
        console.log(`- Typ des Streams: ${stream.type}`);
        console.log(`- Hat der Stream eine lesbare Komponente?: ${!!stream.stream}`);

    } catch (error) {
        console.error('[FAIL] Der isolierte Stream-Test ist fehlgeschlagen. Grund:');
        console.error(error);
    }
})();