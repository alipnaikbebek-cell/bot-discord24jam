const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Inisialisasi DisTube dengan konfigurasi 24 Jam Nonstop
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: false,   // JANGAN keluar jika voice channel sepi/kosong
    leaveOnFinish: false,  // JANGAN keluar jika playlist lagu habis
    leaveOnStop: false,    // JANGAN keluar jika musik distop
    plugins: [new SpotifyPlugin(), new YtDlpPlugin()]
});

// Trik Web Server 24 Jam untuk Render agar server tidak "tidur"
http.createServer((req, res) => {
    res.write("Bot Musik 24 Jam dengan Fitur Lengkap Aktif!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} siap digunakan.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. FITUR PLAY (Putar Musik/Playlist Spotify)
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Masukkan link playlist Spotify atau judul lagu! Contoh: `!play <link>`');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });

            // Sistem Keras Kepala / Anti-Kabur 24 Jam (Auto Reconnect)
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.removeAllListeners('stateChange');
                connection.on('stateChange', (oldState, newState) => {
                    if (newState.status === VoiceConnectionStatus.Disconnected) {
                        console.log('Bot musik terputus paksa. Mengunci ulang koneksi...');
                        setTimeout(() => {
                            try {
                                joinVoiceChannel({
                                    channelId: voiceChannel.id,
                                    guildId: message.guild.id,
                                    adapterCreator: message.guild.voiceAdapterCreator,
                                });
                            } catch (e) {
                                console.error('Gagal reconnect otomatis:', e);
                            }
                        }, 3000); // Coba masuk balik dalam 3 detik
                    }
                });
            }
        } catch (error) {
            console.error(error);
            message.reply('Terjadi kesalahan saat memproses lagu/playlist Spotify.');
        }
    }

    // Ambil data antrean musik saat ini untuk fitur kontrol di bawah
    const queue = distube.getQueue(message);

    // 2. FITUR PAUSE (Jeda Musik)
    if (command === 'pause') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (queue.paused) return message.reply('Musik sudah dalam kondisi dijeda (paused).');
        
        distube.pause(message);
        message.channel.send('⏸️ Musik berhasil dijeda.');
    }

    // 3. FITUR RESUME (Lanjutkan Musik)
    if (command === 'resume') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');
        if (!queue.paused) return message.reply('Musik sedang berjalan, tidak sedang dijeda.');
        
        distube.resume(message);
        message.channel.send('▶️ Musik dilanjutkan kembali.');
    }

    // 4. FITUR NEXT (Lewati ke Lagu Berikutnya)
    if (command === 'next') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        
        try {
            await distube.skip(message);
            message.channel.send('⏭️ Memutar lagu berikutnya.');
        } catch (e) {
            message.reply('Tidak ada lagu berikutnya di antrean playlist kamu.');
        }
    }

    // 5. FITUR BEFORE (Kembali ke Lagu Sebelumnya)
    if (command === 'before') {
        if (!queue) return message.reply('Tidak ada lagu di dalam antrean.');
        
        try {
            await distube.previous(message);
            message.channel.send('⏮️ Kembali memutar lagu sebelumnya.');
        } catch (e) {
            message.reply('Tidak ada riwayat lagu sebelumnya yang bisa diputar.');
        }
    }

    // 6. FITUR LOOP (Ulang Lagu / Playlist)
    if (command === 'loop') {
        if (!queue) return message.reply('Tidak ada lagu yang sedang diputar.');

        const mode = args[0];
        if (mode === 'lagu') {
            distube.setRepeatMode(message, 1);
            message.channel.send('🔂 Loop Aktif: Mengulang **lagu ini saja** terus-menerus.');
        } else if (mode === 'playlist') {
            distube.setRepeatMode(message, 2);
            message.channel.send('🔁 Loop Aktif: Mengulang **seluruh playlist** antrean.');
        } else if (mode === 'off') {
            distube.setRepeatMode(message, 0);
            message.channel.send('▶️ Loop Dinonaktifkan.');
        } else {
            message.reply('Gunakan perintah dengan benar:\n`!loop lagu` (ulang 1 lagu)\n`!loop playlist` (ulang semua lagu)\n`!loop off` (matikan loop)');
        }
    }

    // 7. FITUR LEAVE (Satu-satunya cara legal menyuruh bot keluar)
    if (command === 'leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.removeAllListeners(); // Matikan sistem pengunci otomatis terlebih dahulu
            distube.voices.leave(message); // Keluarkan bot via DisTube
            message.reply('👋 Musik dihentikan dan bot keluar atas perintah admin.');
        } else {
            message.reply('Bot sedang tidak berada di voice channel.');
        }
    }
});

// --- EVENT NOTIFIKASI CHAT ---
distube.on('playSong', (queue, song) => {
    queue.textChannel.send(`🎵 Sedang memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

distube.on('addList', (queue, playlist) => {
    queue.textChannel.send(`✅ Memuat playlist Spotify: **${playlist.name}** (${playlist.songs.length} lagu dimasukkan ke antrean).`);
});

client.login(process.env.DISCORD_TOKEN);
