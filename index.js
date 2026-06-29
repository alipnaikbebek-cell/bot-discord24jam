const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { ExtractorPlugin } = require('@distube/extractor');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inisialisasi DisTube murni tanpa bentrokan library eksternal
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [
        new SpotifyPlugin(),
        new SoundCloudPlugin(),
        new ExtractorPlugin()
    ]
});

// Trik Web Server 24 Jam agar Render tidak tidur
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

    // 1. FITUR PLAY (Murni menggunakan penanganan koneksi DisTube)
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Masukkan link playlist Spotify atau judul lagu!');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');

        try {
            // DisTube akan otomatis join dan mengunci koneksi voice secara aman di sini
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat memproses lagu/playlist Spotify.');
        }
    }

    // 2. FITUR JOIN MANUAL
    if (command === 'join') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');

        try {
            await distube.voices.join(voiceChannel);
            message.reply(`🎤 Berhasil masuk ke channel: **${voiceChannel.name}**`);
        } catch (error) {
            console.error(error);
            message.reply('Gagal masuk ke voice channel.');
        }
    }

    const queue = distube.getQueue(message);

    // 3. FITUR PAUSE
    if (command === 'pause') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (queue.paused) return message.reply('Musik sudah dijeda.');
        distube.pause(message);
        message.channel.send('⏸️ Musik berhasil dijeda.');
    }

    // 4. FITUR RESUME
    if (command === 'resume') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (!queue.paused) return message.reply('Musik sedang berjalan.');
        distube.resume(message);
        message.channel.send('▶️ Musik dilanjutkan kembali.');
    }

    // 5. FITUR NEXT / SKIP
    if (command === 'next' || command === 'skip') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        try {
            await distube.skip(message);
            message.channel.send('⏭️ Memutar lagu berikutnya.');
        } catch (e) {
            message.reply('Tidak ada lagu berikutnya di antrean.');
        }
    }

    // 6. FITUR BEFORE
    if (command === 'before') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        try {
            await distube.previous(message);
            message.channel.send('⏮️ Kembali memutar lagu sebelumnya.');
        } catch (e) {
            message.reply('Tidak ada riwayat lagu sebelumnya.');
        }
    }

    // 7. FITUR LOOP
    if (command === 'loop') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        const mode = args[0];
        if (mode === 'lagu') {
            distube.setRepeatMode(message, 1);
            message.channel.send('🔂 Loop Aktif: Mengulang lagu ini saja.');
        } else if (mode === 'playlist') {
            distube.setRepeatMode(message, 2);
            message.channel.send('🔁 Loop Aktif: Mengulang seluruh antrean.');
        } else if (mode === 'off') {
            distube.setRepeatMode(message, 0);
            message.channel.send('▶️ Loop Dinonaktifkan.');
        } else {
            message.reply('Gunakan: `!loop lagu` | `!loop playlist` | `!loop off`');
        }
    }

    // 8. FITUR LEAVE
    if (command === 'leave') {
        if (queue) {
            distube.voices.leave(message);
            message.reply('👋 Musik dihentikan dan bot keluar.');
        } else {
            message.reply('Bot sedang tidak berada di voice channel.');
        }
    }
});

// --- EVENT TRIGGER NOTIFIKASI ---
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎵 Sedang memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    queue.textChannel.send(`✅ Memuat playlist Spotify: **${playlist.name}** (${playlist.songs.length} lagu dimasukkan ke antrean).`);
});

// Penanganan Error Internal agar bot tidak gampang crash/log error menumpuk
distube.on('error', (channel, e) => {
    console.error(e);
    if (channel) channel.send(`❌ Terjadi kendala pemrosesan audio: ${e.message.slice(0, 100)}`);
});

client.login(process.env.DISCORD_TOKEN);
