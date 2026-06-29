const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inisialisasi murni bebas modul luar yang bikin MODULE_NOT_FOUND
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin()
    ]
});

// Web Server 24 Jam Render
http.createServer((req, res) => {
    res.write("Bot Musik 24 Jam Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} siap digunakan.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Masukkan link playlist Spotify atau judul lagu!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat memproses lagu.');
        }
    }

    if (command === 'join') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');
        try {
            await distube.voices.join(voiceChannel);
            message.reply(`🎤 Berhasil masuk ke: **${voiceChannel.name}**`);
        } catch (error) {
            message.reply('Gagal masuk ke voice channel.');
        }
    }

    const queue = distube.getQueue(message);

    if (command === 'pause') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (queue.paused) return message.reply('Musik sudah dijeda.');
        distube.pause(message);
        message.channel.send('⏸️ Musik dijeda.');
    }

    if (command === 'resume') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (!queue.paused) return message.reply('Musik sedang berjalan.');
        distube.resume(message);
        message.channel.send('▶️ Musik dilanjutkan.');
    }

    if (command === 'next' || command === 'skip') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        try {
            await distube.skip(message);
            message.channel.send('⏭️ Memutar lagu berikutnya.');
        } catch (e) {
            message.reply('Tidak ada lagu berikutnya.');
        }
    }

    if (command === 'leave') {
        distube.voices.leave(message);
        message.reply('👋 Bot keluar.');
    }
});

distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎵 Sedang memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    queue.textChannel.send(`✅ Memuat playlist: **${playlist.name}** (${playlist.songs.length} lagu masuk antrean).`);
});

distube.on('error', (channel, e) => {
    console.error(e);
});

client.login(process.env.DISCORD_TOKEN);
