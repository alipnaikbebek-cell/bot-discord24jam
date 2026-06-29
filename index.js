const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtdlPlugin } = require('@distube/ytdl-core'); // Modul ekstraksi yang stabil
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inisialisasi DisTube dengan kombinasi extractor lengkap
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(),
        new YtdlPlugin()
    ]
});

// Jalur Web Server Render agar bot online 24 jam
http.createServer((req, res) => {
    res.write("Bot Musik Online!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} telah terhubung.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Masukkan link playlist atau judul lagu!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus berada di voice channel terlebih dahulu!');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
        }
    }

    const queue = distube.getQueue(message);

    if (command === 'next' || command === 'skip') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        try {
            await distube.skip(message);
            message.channel.send('⏭️ Memutar lagu berikutnya.');
        } catch (e) {
            message.reply('Tidak ada lagu berikutnya di dalam antrean.');
        }
    }

    if (command === 'pause') {
        if (!queue) return message.reply('Tidak ada musik yang sedang berputar.');
        distube.pause(message);
        message.channel.send('⏸️ Musik dijeda.');
    }

    if (command === 'resume') {
        if (!queue) return message.reply('Tidak ada musik yang sedang berputar.');
        distube.resume(message);
        message.channel.send('▶️ Musik dilanjutkan.');
    }

    if (command === 'leave') {
        distube.voices.leave(message);
        message.reply('👋 Bot keluar dari voice channel.');
    }
});

// Event Handler Notifikasi Chat
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎵 Sedang memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    queue.textChannel.send(`✅ Memuat playlist: **${playlist.name}** (${playlist.songs.length} lagu dimasukkan ke antrean).`);
});

distube.on('error', (channel, e) => {
    // Dibiarkan kosong agar log Render bersih dari object dump panjang
});

client.login(process.env.DISCORD_TOKEN);
