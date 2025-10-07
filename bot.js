// index.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { loadCommands } = require('./utils/commandLoader');
const { handleCommand } = require('./utils/helpers');
const { forwardMessage } = require('./chatPairs');
const qrcode = require('qrcode');
const chalk = require('chalk');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./sessions/auth_info.json');

async function startBot() {
    console.clear();
    console.log(chalk.magenta('🤖 Starte Anonymer WhatsApp Bot...'));

    loadCommands(); // 📦 Lade alle Commands und zeige Status

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Für Terminalscan
    });

    // 📷 QR-Code automatisch als Bild speichern
    sock.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect } = update;

        if (qr) {
            console.log(chalk.yellow('📸 Speichere QR-Code als Bild (qr.png)...'));
            await qrcode.toFile('./qr.png', qr);
        }

        if (connection === 'open') {
            console.log(chalk.green('✅ Verbunden mit WhatsApp!'));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log(chalk.red('❌ Verbindung getrennt!'), { reconnect: shouldReconnect });
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveState);

    // 📩 Neue Nachrichten verarbeiten
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        const number = sender.split('@')
