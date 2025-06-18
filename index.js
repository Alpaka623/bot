require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus ,Events } = require('@discordjs/voice');
const { join } = require('path');
const { time } = require('console');
const { channel } = require('diagnostics_channel');

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
        case '!join':   if (!message.member.voice.channel) {
                            return message.reply('Du musst in einem Sprachkanal sein, um diesen Befehl zu verwenden!'); 
                        } else {
                            connection = joinVoiceChannel({
                                channelId: message.member.voice.channel.id,
                                guildId: message.guild.id, 
                                adapterCreator: message.guild.voiceAdapterCreator, 
                            });
                            connection.subscribe(player);
                            player.play(resource);
                        }
                        break;
        case '!leave':  connection = getVoiceConnection(message.guild.id);
                        if (connection) {
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
                            message.reply(`Die Datei ${message.content.split(" ")[1]} wurde zur Warteschlange hinzugefügt.`);
                        } else {
                            connection = joinVoiceChannel({
                                channelId: message.member.voice.channel.id,
                                guildId: message.guild.id, 
                                adapterCreator: message.guild.voiceAdapterCreator, 
                            });
                            connection.subscribe(player);
                            resource = createAudioResource(join(__dirname, 'music', `${message.content.split(" ")[1]}.mp3`));
                            player.stop();
                            player.play(resource);
                        }
                        break;
        case '!skip':   if (player.state.status === AudioPlayerStatus.Playing) {
                            player.stop();
                        } else {
                            message.reply('Es wird gerade nichts abgespielt!');
                        }
        }
});



client.login(process.env.TOKEN);