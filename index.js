require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus ,Events, StreamType } = require('@discordjs/voice');
const { join } = require('path');
const { time } = require('console');
const { channel } = require('diagnostics_channel');
const fs = require('fs').promises;
const play = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const { type } = require('os');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,   
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates   
    ]
});

function createStyledEmbed(title, description, color = 0x3498db) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
}

let resource = createAudioResource(join(__dirname, 'music', 'test.mp3'));

const player = createAudioPlayer();

let queue = [];

let channelId;

client.once('ready', () => {
    console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);
});

let connection;

player.on('error', error => {
    console.error(`Fehler im AudioPlayer: ${error.message}`);
    player.emit(AudioPlayerStatus.Idle);
});

player.on(AudioPlayerStatus.Playing, () => {
    console.log('The audio player has started playing!');
});

player.on(AudioPlayerStatus.Idle, async () => {
    if (queue.length === 0) {
        try {
            const channel = await client.channels.fetch(channelId);
            await channel.send({ embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange ist leer. Ich verlasse den Sprachkanal in 60s.', 0xe74c3c)] });
            
            setTimeout(() => {
                const connection = getVoiceConnection(channel.guild.id);
                if (connection) {
                    connection.destroy();
                }
            }, 60000);
        } catch (error) {
            console.error("Fehler im Idle-Handler bei leerer Queue:", error);
        }
        return;
    }

    const nextSong = queue.shift();

    if (!nextSong) {
        console.error("Ungültiges 'undefined' Objekt in der Queue gefunden. Überspringe.");
        return player.emit(AudioPlayerStatus.Idle);
    }

    try {
        let resource;

        if (nextSong.type === 'youtube') {
            if (!nextSong.url) {
                throw new Error('YouTube-Songobjekt in der Queue hat keine URL.');
            }

            const stream = ytdl(nextSong.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
            });

            resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                metadata: { title: nextSong.title },
                inlineVolume: true
            });

        } else {
            const filePath = join(__dirname, 'music', `${nextSong.path}.mp3`);
            resource = createAudioResource(filePath, {
                metadata: { title: nextSong.title },
                inlineVolume: true
            });
        }

        resource.volume.setVolume(0.4);
        
        player.play(resource);

    } catch (error) {
        console.error(`Fehler beim Abspielen von '${nextSong.title}':`, error);
        const channel = await client.channels.fetch(channelId);
        await channel.send({ embeds: [createStyledEmbed('Fehler', `Konnte **${nextSong.title}** nicht abspielen. Überspringe...`, 0xe74c3c)] });
        player.emit(AudioPlayerStatus.Idle); 
    }
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    if(!message.content.startsWith('!')) return;
    (async () => {
      if (play.is_expired()) {
            await play.refreshToken();
    }
    })();

    channelId = message.channel.id;

    switch (message.content.split(" ")[0]) {
        case '!all': {                        if (!message.member.voice.channel) {
                            return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst in einem Sprachkanal sein.', 0xe74c3c)] });
                        }

                        (async () => {
                            try {
                                const musicDir = join(__dirname, 'music');
                                const files = await fs.readdir(musicDir);

                                const songObjects = files
                                    .filter(file => file.endsWith('.mp3'))
                                    .map(file => {
                                        const fileName = file.slice(0, -4);
                                        return {
                                            type: 'local',
                                            title: fileName.replaceAll('-', ' '),
                                            path: fileName
                                        };
                                    });

                                if (songObjects.length === 0) {
                                    return message.reply({ embeds: [createStyledEmbed('Fehler', 'Ich konnte keine Lieder im `music`-Ordner finden.', 0xe74c3c)] });
                                }

                                queue.push(...songObjects);
                                await message.reply({ embeds: [createStyledEmbed('Musik geladen', `Ich habe **${songObjects.length}** Lieder zur Warteschlange hinzugefügt.`)] });
                                
                                const existingConnection = getVoiceConnection(message.guild.id);

                                if (!existingConnection) {
                                    const connection = joinVoiceChannel({
                                        channelId: message.member.voice.channel.id,
                                        guildId: message.guild.id,
                                        adapterCreator: message.guild.voiceAdapterCreator,
                                        selfDeaf: false
                                    });
                                    connection.subscribe(player);
                                }
                                
                                if (player.state.status === AudioPlayerStatus.Idle) {
                                    player.emit(AudioPlayerStatus.Idle);
                                }

                            } catch (error) {
                                console.error("Fehler im !all-Befehl:", error);
                                message.reply({ embeds: [createStyledEmbed('Fehler', 'Ein Fehler ist aufgetreten.', 0xe74c3c)] });
                            }
                        })();
                        break;
                    }
        case '!leave':  connection = getVoiceConnection(message.guild.id);
                        if (connection) {
                            queue = [];
                            connection.destroy();
                            player.stop();
                        } else {
                            message.reply({ embeds: [createStyledEmbed('Fehler', 'Ich bin in keinem Sprachkanal!', 0xe74c3c)] });
                        }
                        break;
        case '!pause':  player.pause();
                        break;
        case '!resume': player.unpause();
                        break;
        case '!play':   (async () => {
                        const songQuery = message.content.split(' ').slice(1).join(' ');
                        if (!songQuery) {
                            return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst einen Songnamen oder YouTube-Link angeben.', 0xe74c3c)] });
                        }

                        if (!message.member.voice.channel) {
                            return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst in einem Sprachkanal sein.', 0xe74c3c)] });
                        }

                        const startPlayback = async () => {
                            if (player.state.status === AudioPlayerStatus.Idle && queue.length > 0) {
                                player.emit(AudioPlayerStatus.Idle);
                            }
                        };

                        const formattedFileName = songQuery.toLowerCase().replaceAll(' ', '-');
                        const localFilePath = join(__dirname, 'music', `${formattedFileName}.mp3`);

                        try {
                            await fs.access(localFilePath);

                            const songObject = {
                                type: 'local',
                                title: songQuery,
                                path: formattedFileName
                            };
                            queue.push(songObject);
                            await message.reply({ embeds: [createStyledEmbed('Zur Warteschlange hinzugefügt (Lokal)', `**${songObject.title}** wurde hinzugefügt.`)] });

                        } catch (error) {
                            try {
                                const replyMessage = await message.reply({ embeds: [createStyledEmbed('Suche...', `Lokale Datei nicht gefunden. Suche auf YouTube nach: **${songQuery}**`)] });

                                if (songQuery.startsWith('https://open.spotify.com/playlist/') || songQuery.startsWith('https://open.spotify.com/album/')) {
                                    await replyMessage.edit({ embeds: [createStyledEmbed('Lade Playlist...', `Verarbeite die Spotify-Playlist. Das kann einen Moment dauern...`)] });
                                    let playlist = await play.spotify(songQuery);
                                    const videos = await playlist.all_tracks();
                                    if (videos.length === 0) {
                                        return replyMessage.edit({ embeds: [createStyledEmbed('Fehler', 'Konnte keine abspielbaren Lieder in dieser Playlist finden.', 0xe74c3c)] });
                                    }

                                    for (let i = 0; i < videos.length; i++) {
                                        try {
                                            song = await play.search(`${videos[i].name}`, {
                                            limit: 1
                                            });
                                            videos[i].url = song[0].url;
                                            console.log(`Gefundenes YouTube-Video: ${videos[i].name} - ${videos[i].url}`);
                                        }
                                        catch (error) {
                                            console.error(`Fehler beim Suchen von ${videos[i].name}:`, error);
                                            const channel = await client.channels.fetch(channelId);
                                            channel.send({ embeds: [createStyledEmbed('Fehler', `Konnte **${videos[i].name}** nicht finden. Überspringe...`, 0xe74c3c)] });
                                            continue;
                                        }
                                        
                                    }

                                    const songObjects = videos.map(video => ({
                                        type: 'youtube',
                                        title: video.name,
                                        url: video.url
                                    }));
                                    
                                    queue.push(...songObjects);
                                    await replyMessage.edit({ embeds: [createStyledEmbed('Playlist geladen', `**${songObjects.length}** Lieder von Spotify wurden zur Warteschlange hinzugefügt.`)] });

                                }else if(songQuery.startsWith('https://open.spotify.com')) {
                                    let sp_data = await play.spotify(songQuery);
        
                                    let searched = await play.search(`${sp_data.name}`, {
                                        limit: 1
                                    })
                                    const songObject = {
                                        type: 'youtube',
                                        title: sp_data.name,
                                        url:   searched[0].url
                                    };
                                    console.log("Gefundenes YouTube-Video:", songObject);
                                    queue.push(songObject);
                                    
                                    await replyMessage.edit({ embeds: [createStyledEmbed('Zur Warteschlange hinzugefügt (YouTube)', `**${songObject.title}** wurde hinzugefügt.`)] });
                                    
                                }else {
                                const searchResults = await play.search(songQuery, { limit: 1, source: { youtube: 'video' } });
                                if (searchResults.length === 0) {
                                    return replyMessage.edit({ embeds: [createStyledEmbed('Fehler', 'Ich konnte auf YouTube nichts finden.', 0xe74c3c)] });
                                }

                                const video = searchResults[0];
                                const songObject = {
                                    type: 'youtube',
                                    title: video.title,
                                    url: video.url
                                };
                                console.log("Gefundenes YouTube-Video:", songObject);
                                queue.push(songObject);
                                
                                await replyMessage.edit({ embeds: [createStyledEmbed('Zur Warteschlange hinzugefügt (YouTube)', `**${songObject.title}** wurde hinzugefügt.`)] });
                                }
                            } catch (searchError) {
                                console.error("Fehler bei der YouTube-Suche:", searchError);
                                await message.reply({ embeds: [createStyledEmbed('Fehler', 'Bei der YouTube-Suche ist ein Fehler aufgetreten.', 0xe74c3c)] });
                                return;
                            }
                        }

                        const existingConnection = getVoiceConnection(message.guild.id);

                        if (!existingConnection) {
                            const connection = joinVoiceChannel({
                                channelId: message.member.voice.channel.id,
                                guildId: message.guild.id,
                                adapterCreator: message.guild.voiceAdapterCreator,
                                selfDeaf: false
                            });
                            connection.subscribe(player);
                        }
                        
                        startPlayback();
                        })()
                        break;
        case '!skip':   if (player.state.status === AudioPlayerStatus.Playing) {
                            player.stop();
                        } else {
                            message.reply({ embeds: [createStyledEmbed('Fehler', 'Es wird gerade keine Musik abgespielt.', 0xe74c3c)] });
                        }
                        break;
        case '!queue': {
                        if (queue.length === 0) {
                            return message.reply({ embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange ist derzeit leer.', 0xe74c3c)] });
                        }

                        const itemsToShow = 60;
                        const queueToShow = queue.slice(0, itemsToShow);

                        const queueString = queueToShow
                            .map((song, index) => `**${index + 1}.** ${song.title}`)
                            .join('\n');

                        const embed = createStyledEmbed(
                            `Warteschlange (${queue.length} Songs)`,
                            queueString
                        );

                        if (queue.length > itemsToShow) {
                            embed.setFooter({ text: `... und ${queue.length - itemsToShow} weitere Lieder.` });
                        }

                        message.reply({ embeds: [embed] });
                        break;
                    }
        case '!clear':  queue = [];
                        message.reply({ embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange wurde geleert.')] });
                        break;
        case '!shuffle': if (queue.length > 0) {
                            for (let i = queue.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [queue[i], queue[j]] = [queue[j], queue[i]];
                            }
                            message.reply({ embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange wurde gemischt.')] });
                        }
                        break;
        case '!showall':(async () => {
                            try {
                                const allFiles = await fs.readdir(join(__dirname, 'music'));
                                const songListString = allFiles
                                    .filter(file => file.endsWith('.mp3'))
                                    .map((song, index) => {
                                        const formattedSong = song.slice(0, -4).replaceAll('-', ' ');
                                        return `**${index + 1}.** ${formattedSong}`;
                                    })
                                    .join('\n');

                                if (!songListString) {
                                    return message.reply({ embeds: [createStyledEmbed('Alle Lieder', 'Ich habe keine Lieder im `music`-Ordner gefunden.', 0xe74c3c)] });
                                }

                                message.reply({ embeds: [createStyledEmbed('Alle Lieder', songListString)] });

                            } catch (error) {
                                console.error("Fehler im !showall-Befehl:", error);
                                message.reply({ embeds: [createStyledEmbed('Fehler', 'Konnte die Songliste nicht erstellen.', 0xe74c3c)] });
                            }
                        })(); 
                        break;

        case '!export': (async () => {
                            try {
                            let songName = message.content.split(' ').slice(1).join(' ');
                            if(songName === 'current') songName = player.state.resource.metadata.title;
                            console.log("Songname:", songName);
                            if (!songName) {
                                return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst einen Songnamen angeben.', 0xe74c3c)] });
                            }

                            const fileName = songName.toLowerCase().replaceAll(' ', '-');
                            const filePath = join(__dirname, 'music', `${fileName}.mp3`);

                            await fs.access(filePath);

                            const attachment = new AttachmentBuilder(filePath, { name: `${fileName}.mp3` });

                            await message.reply({
                                files: [attachment]
                            });

                            } catch (error) {
                                console.error("Fehler im !export-Befehl:", error);
                                message.reply({ embeds: [createStyledEmbed('Fehler', 'Ich konnte diese Datei nicht finden. Stelle sicher, dass der Name korrekt ist.', 0xe74c3c)] });
                            }
                        })();
                        break;
        case '!current': if (player.state.status === AudioPlayerStatus.Playing) {
                            const currentResource = player.state.resource;
                            const currentTitle = currentResource.metadata.title;
                            message.reply({ embeds: [createStyledEmbed('Aktuelles Lied', `Ich spiele gerade: **${currentTitle}**`)] });
                        } else {
                            message.reply({ embeds: [createStyledEmbed('Aktuelles Lied', 'Es wird gerade keine Musik abgespielt.', 0xe74c3c)] });
                        }
                        break;
        case '!help':   message.reply({ embeds: [createStyledEmbed('Hilfe', 'Hier sind die verfügbaren Befehle:\n\n' +
                            '**!all** - Alle Lieder im `music`-Ordner abspielen\n' +
                            '**!leave** - Verlasse den Sprachkanal und stoppe die Musik\n' +
                            '**!pause** - Musik pausieren\n' + 
                            '**!resume** - Musik fortsetzen\n' +
                            '**!play <Liedname>** - Ein Lied abspielen\n' +
                            '**!skip** - Aktuelles Lied überspringen\n' +
                            '**!queue** - Zeige die Warteschlange an\n' +
                            '**!clear** - Leere die Warteschlange\n' +
                            '**!shuffle** - Mische die Warteschlange\n' +
                            '**!showall** - Zeige alle Lieder im `music`-Ordner an\n' +
                            '**!export <Liedname>** - Exportiere ein Lied als Datei\n' +
                            '**!current** - Zeige das aktuell gespielte Lied an\n' +
                            '**!help** - Zeige diese Hilfe an', 0x2ecc71)] });
                        break;
        }
});



client.login(process.env.TOKEN);