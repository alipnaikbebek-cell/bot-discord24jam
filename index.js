const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Ditambahkan agar bot bisa mendeteksi voice channel
    ]
});

// Web server palsu untuk Render 24 jam
http.createServer((req, res) => {
    res.write("Bot aktif 24 jam nonstop!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} sekarang online.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Perintah Teks Biasa
    if (message.content === '!ping') {
        return message.reply('🏓 Pong!');
    }

    // Perintah JOIN Voice Channel
    if (message.content === '!join') {
        const voiceChannel = message.member.voice.channel;
        
        // Cek apakah user yang mengetik perintah sudah masuk ke voice channel
        if (!voiceChannel) {
            return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');
        }

        try {
            // Proses bot bergabung ke voice channel
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            
            message.reply(`🎤 Berhasil masuk ke channel: **${voiceChannel.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('Gagal masuk ke voice channel.');
        }
    }

    // Perintah LEAVE/KELUAR Voice Channel
    if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        
        if (connection) {
            connection.destroy();
            message.reply('👋 Keluar dari voice channel.');
        } else {
            message.reply('Bot sedang tidak berada di voice channel mana pun.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
