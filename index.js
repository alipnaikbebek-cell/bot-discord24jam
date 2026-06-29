const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates 
    ]
});

// Web server agar Render tidak mematikan bot (Trik 24 Jam)
http.createServer((req, res) => {
    res.write("Bot Anti-Kabur aktif 24 jam nonstop!");
    res.end();
}).listen(process.env.PORT || 3000);

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} sekarang online.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!ping') {
        return message.reply('🏓 Pong!');
    }

    // Perintah JOIN Voice Channel
    if (message.content === '!join') {
        const voiceChannel = message.member.voice.channel;
        
        if (!voiceChannel) {
            return message.reply('Kamu harus masuk ke voice channel terlebih dahulu!');
        }

        try {
            // Fungsi untuk membuat koneksi suara
            const connectBot = () => {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                // KUNCI UTAMA: Deteksi status koneksi bot
                connection.on('stateChange', (oldState, newState) => {
                    // Jika status berubah menjadi Disconnected (terputus karena alasan apa pun)
                    if (newState.status === VoiceConnectionStatus.Disconnected) {
                        console.log('Bot terputus otomatis/paksa. Memaksa masuk kembali dalam 3 detik...');
                        
                        setTimeout(() => {
                            // Cek apakah koneksi benar-benar hancur, jika iya buat koneksi baru ke channel yang sama
                            const currentConnection = getVoiceConnection(message.guild.id);
                            if (!currentConnection || currentConnection.state.status === VoiceConnectionStatus.Disconnected) {
                                connectBot(); // Panggil fungsi ini lagi untuk masuk paksa
                            }
                        }, 3000); // Jeda 3 detik sebelum masuk lagi
                    }
                });
            };

            // Jalankan fungsi koneksi pertama kali
            connectBot();
            message.reply(`🎤 Berhasil masuk dan dikunci di channel: **${voiceChannel.name}** (Akan bertahan biarpun sepi!)`);

        } catch (error) {
            console.error(error);
            message.reply('Gagal masuk ke voice channel.');
        }
    }

    // Perintah LEAVE (Hanya ini satu-satunya cara legal agar bot bisa keluar)
    if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        
        if (connection) {
            // Hapus semua event listener agar dia tidak mencoba masuk lagi saat dihancurkan secara manual
            connection.removeAllListeners(); 
            connection.destroy();
            message.reply('👋 Keluar atas perintah admin.');
        } else {
            message.reply('Bot sedang tidak berada di voice channel mana pun.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
