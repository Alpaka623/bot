require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
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

function createStyledEmbed(title, description, color = 0x3498db) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
}

const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('queue_previous') // Eindeutige ID für den Listener
            .setLabel('◀️ Zurück')
            .setStyle(ButtonStyle.Primary), // Farbe des Knopfes
            
        new ButtonBuilder()
            .setCustomId('queue_next')
            .setLabel('Weiter ▶️')
            .setStyle(ButtonStyle.Primary)
    );

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
    let name = queue[0].replaceAll('-', ' ');
    if(queue.length > 0) {
        resource = createAudioResource(join(__dirname, 'music', `${queue.shift()}.mp3`), {metadata: { title: name }});
        player.play(resource);
    } else {
        const channel = await client.channels.fetch(channelId);
        channel.send({ embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange ist leer. Ich werde in 60s den Sprachkanal verlassen.', 0xe74c3c)], components: [] });
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
                            return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst in einem Sprachkanal sein, um Musik abzuspielen!', 0xe74c3c)] });
                        }

                        (async () => {
                            const musicDir = join(__dirname, 'music');

                            try {
                                const files = await fs.readdir(musicDir);
                                const songs = files
                                    .filter(file => file.endsWith('.mp3'))
                                    .map(file => file.slice(0, -4));

                                if (songs.length === 0) {
                                    return message.reply({ embeds: [createStyledEmbed('Fehler', 'Es wurden keine Musikdateien gefunden.', 0xe74c3c)] });
                                }

                                queue.push(...songs);
                                await message.reply({ embeds: [createStyledEmbed('Musik geladen', `Ich habe **${songs.length}** Lieder geladen.`)] });

                                const existingConnection = getVoiceConnection(message.guild.id);
                                
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

                                if (!existingConnection) {
                                    const connection = joinVoiceChannel({
                                        channelId: message.member.voice.channel.id,
                                        guildId: message.guild.id,
                                        adapterCreator: message.guild.voiceAdapterCreator,
                                        selfDeaf: false
                                    });
                                    connection.subscribe(player);
                                    startPlaying(); 
                                } else if (player.state.status === AudioPlayerStatus.Idle) {
                                    startPlaying();
                                }

                            } catch (error) {
                                console.error("Fehler im !all-Befehl:", error);
                                message.reply({ embeds: [createStyledEmbed('Fehler', 'Ein Fehler ist aufgetreten, während ich die Musikdateien geladen habe.', 0xe74c3c)] });
                            }
                        })();

                        break;
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
        case '!play':   if (!message.member.voice.channel) {
                            return message.reply({ embeds: [createStyledEmbed('Fehler', 'Du musst in einem Sprachkanal sein, um Musik abzuspielen!', 0xe74c3c)] }); 
                        } else if (player.state.status === AudioPlayerStatus.Playing) {
                            queue.push(message.content.split(' ').slice(1).join(' ').toLowerCase().replaceAll(' ', '-'));
                            message.reply({ embeds: [createStyledEmbed('Warteschlange', `**${message.content.split(' ').slice(1).join(' ')}** wurde zur Warteschlange hinzugefügt.`)] });
                        } else {
                            connection = joinVoiceChannel({
                                channelId: message.member.voice.channel.id,
                                guildId: message.guild.id, 
                                adapterCreator: message.guild.voiceAdapterCreator, 
                            });
                            connection.subscribe(player);
                            resource = createAudioResource(
                                join(__dirname, 'music', `${message.content.split(' ').slice(1).join(' ').toLowerCase().replaceAll(' ', '-')}.mp3`),
                                { metadata: { title: message.content.split(' ').slice(1).join(' ') } }
                            );
                            player.stop();
                            player.play(resource);
                        }
                        break;
        case '!skip':   if (player.state.status === AudioPlayerStatus.Playing) {
                            player.stop();
                        } else {
                            message.reply({ embeds: [createStyledEmbed('Fehler', 'Es wird gerade keine Musik abgespielt.', 0xe74c3c)] });
                        }
                        break;
        case '!queue':  if (queue.length > 0) {
                            const queueString = queue
                                .map((song, index) => {
                                    const formattedSong = song.replaceAll('-', ' ');
                                    return `**${index + 1}.** ${formattedSong}`;
                                })
                                .join('\n');
                            message.reply({ embeds: [createStyledEmbed('Warteschlange', queueString)]});
                        } else {
                            message.reply({embeds: [createStyledEmbed('Warteschlange', 'Die Warteschlange ist leer.', 0xe74c3c)]});
                        }
                        break;
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