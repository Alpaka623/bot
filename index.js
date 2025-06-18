require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus ,Events } = require('@discordjs/voice');
const { join } = require('path');
const { time } = require('console');
const { channel } = require('diagnostics_channel');
const fs = require('fs').promises;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,   
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates   
    ]
});

let resource = createAudioResource(join(__dirname, 'music', 'test.mp3'));

const player = createAudioPlayer();

let queue = [];

let channelId;

client.once('ready', () => {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);
});

let connection;

player.on('error', error => {
	console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
	player.play(getNextResource());
});

player.on(AudioPlayerStatus.Playing, () => {
    console.log('The audio player has started playing!');
});

player.on(AudioPlayerStatus.Idle, async () => {
    if(queue.length > 0) {
        resource = createAudioResource(join(__dirname, 'music', `${queue.shift()}.mp3`));
        player.play(resource);
    } else {
        const channel = await client.channels.fetch(channelId);
        channel.send('Die Warteschlange ist leer.');
        setTimeout(() => {
                connection.destroy();
                player.stop();
            }, 60000);
    }
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    if(!message.content.startsWith('!')) return;

    channelId = message.channel.id;

    switch (message.content.split(" ")[0]) {
        case '!all':    if (!message.member.voice.channel) {
                            return message.reply('Du musst in einem Sprachkanal sein, um diesen Befehl zu verwenden!');
                        }

                        // Wir erstellen eine sofort-ausführende async Funktion (IIFE)
                        (async () => {
                            const musicDir = join(__dirname, 'music');

                            try {
                                const files = await fs.readdir(musicDir);
                                const songs = files
                                    .filter(file => file.endsWith('.mp3'))
                                    .map(file => file.slice(0, -4));

                                if (songs.length === 0) {
                                    return message.reply('Ich habe keine Lieder im `music`-Ordner gefunden.');
                                }

                                queue.push(...songs);
                                await message.reply(`${songs.length} Lieder wurden zur Warteschlange hinzugefügt!`);

                                const existingConnection = getVoiceConnection(message.guild.id);
                                
                                // Diese Hilfsfunktion startet die Wiedergabe, um Code-Wiederholung zu vermeiden
                                const startPlaying = () => {
                                    if (queue.length > 0) {
                                        const nextSong = queue.shift();
                                        const resource = createAudioResource(join(musicDir, `${nextSong}.mp3`), {
                                            inlineVolume: true
                                        });
                                        resource.volume.setVolume(0.4);
                                        player.play(resource);
                                        // Wir müssen nicht auf diese Nachricht warten
                                        message.channel.send(`Spiele jetzt: ${nextSong}`);
                                    }
                                };

                                // Wenn der Bot noch nicht verbunden ist, erstelle die Verbindung
                                if (!existingConnection) {
                                    const connection = joinVoiceChannel({
                                        channelId: message.member.voice.channel.id,
                                        guildId: message.guild.id,
                                        adapterCreator: message.guild.voiceAdapterCreator,
                                        selfDeaf: false
                                    });
                                    connection.subscribe(player);
                                    startPlaying(); // Starte die Wiedergabe nach dem Verbinden
                                } else if (player.state.status === AudioPlayerStatus.Idle) {
                                    // Wenn der Bot verbunden aber untätig ist, starte die Wiedergabe
                                    startPlaying();
                                }
                                // Wenn der Bot bereits spielt, wurden die Lieder nur zur Queue hinzugefügt. Das ist korrekt.

                            } catch (error) {
                                console.error("Fehler im !all-Befehl:", error);
                                message.reply('Es gab einen Fehler beim Verarbeiten deines Befehls.');
                            }
                        })();

                        break;
        case '!leave':  connection = getVoiceConnection(message.guild.id);
                        if (connection) {
                            queue = [];
                            connection.destroy();
                            player.stop();
                        } else {
                            message.reply('Ich bin in keinem Sprachkanal!');
                        }
                        break;
        case '!pause':  player.pause();
                        break;
        case '!resume': player.unpause();
                        break;
        case '!play':   if (!message.member.voice.channel) {
                            return message.reply('Du musst in einem Sprachkanal sein, um diesen Befehl zu verwenden!'); 
                        } else if (player.state.status === AudioPlayerStatus.Playing) {
                            queue.push(message.content.split(" ")[1]);
                            message.reply(`Die Datei ${message.content.split(' ').slice(1).join(' ')} wurde zur Warteschlange hinzugefügt.`);
                        } else {
                            connection = joinVoiceChannel({
                                channelId: message.member.voice.channel.id,
                                guildId: message.guild.id, 
                                adapterCreator: message.guild.voiceAdapterCreator, 
                            });
                            connection.subscribe(player);
                            resource = createAudioResource(join(__dirname, 'music', `${message.content.split(' ').slice(1).join(' ').toLowerCase().replaceAll(' ', '-')}.mp3`));
                            player.stop();
                            player.play(resource);
                        }
                        break;
        case '!skip':   if (player.state.status === AudioPlayerStatus.Playing) {
                            player.stop();
                        } else {
                            message.reply('Es wird gerade nichts abgespielt!');
                        }
                        break;
        case '!queue':  if (queue.length > 0) {
                            message.reply(`Aktuelle Warteschlange: ${queue.join(', ')}`);
                        } else {
                            message.reply('Die Warteschlange ist leer.');
                        }
                        break;
        case '!clear':  queue = [];
                        message.reply('Die Warteschlange wurde geleert.');
                        break;
        case '!shuffle': if (queue.length > 0) {
                            for (let i = queue.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [queue[i], queue[j]] = [queue[j], queue[i]];
                            }
                            message.reply('Die Warteschlange wurde gemischt.');
                        }
        }
});



client.login(process.env.TOKEN);