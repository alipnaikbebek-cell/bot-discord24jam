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

// Inisialisasi murni dan stabil tanpa dependensi luar yang rawan crash
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new SpotifyPlugin({
            emitEventsAfterFetching: true
        }),
        new SoundCloudPlugin()
    ]
});

// Web Server 24 Jam Render
http.createServer((req, res) => {
    res.write("Bot Musik Online!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} siap dijalankan.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Masukkan judul lagu atau link playlist Spotify kamu!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            // Error diredam agar tidak membuat bot crash
        }
    }

    const queue = distube.getQueue(message);

    if (command === 'next' || command === 'skip') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        try {
            await distube.skip(message);
            message.channel.send('⏭️ Memutar lagu berikutnya.');
        } catch (e) {
            message.reply('Tidak ada lagu berikutnya.');
        }
    }

    if (command === 'pause') {
        if (!queue) return message.reply('Tidak ada musik yang berputar.');
        distube.pause(message);
        message.channel.send('⏸️ Musik dijeda.');
    }

    if (command === 'resume') {
        if (!queue) return message.reply('Tidak ada musik yang berputar.');
        distube.resume(message);
        message.channel.send('▶️ Musik dilanjutkan.');
    }

    if (command === 'leave') {
        distube.voices.leave(message);
        message.reply('👋 Bot keluar.');
    }
});

// Event trigger info chat
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎵 Sedang memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    queue.textChannel.send(`✅ Memuat playlist: **${playlist.name}** (${playlist.songs.length} lagu masuk antrean).`);
});

distube.on('error', (channel, e) => {
    // Dibiarkan kosong agar log Render bersih dari object dump panjang
});

client.login(process.env.DISCORD_TOKEN);
