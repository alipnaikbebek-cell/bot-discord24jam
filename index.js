const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- TRIK SISTEM 24 JAM ---
// Membuat web server palsu agar hosting cloud tidak mematikan bot kita
http.createServer((req, res) => {
    res.write("Bot aktif 24 jam nonstop!");
    res.end();
}).listen(process.env.PORT || 3000);
// --------------------------

client.once('ready', () => {
    console.log(`Sukses! ${client.user.tag} sekarang online.`);
});

// Fitur Merespons Pesan Teks
client.on('messageCreate', (message) => {
    // Abaikan jika yang mengetik adalah bot lain
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('🏓 Pong!');
    }
    
    if (message.content === '!halo') {
        message.reply(`Halo juga @${message.author.username}! Selamat datang di server.`);
    }
});

// Mengambil token dari sistem hosting demi keamanan
client.login(process.env.DISCORD_TOKEN);