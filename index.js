const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');

const authDir = './auth_info';

const waitingQueue = [];
const partners = new Map();
const searchTimeouts = new Map();

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['BetaBot', 'Desktop', '1.0'],
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR-Code zum Scannen:');
      qrcodeTerminal.generate(qr, { small: true });
    }



    const waitingQueue = [];
    const partners = new Map();
    const searchTimeouts = new Map();
    




    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('User ausgeloggt. Auth-Daten werden gelöscht.');
        process.exit(1);
      } else {
        console.log('Verbindung getrennt, versuche neu zu verbinden...');
        setTimeout(start, 5000);
      }
    }

    if (connection === 'open') {
      console.log('✅ Verbindung hergestellt!');
    }
  });

  // Funktion, um Profilbild abzurufen (URL)
  async function getProfilePicture(jid) {
    try {
      const url = await sock.profilePictureUrl(jid, 'image');
      return url;
    } catch {
      return null;
    }
  }

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    const sender = msg.key.remoteJid;




    if (partners.has(sender)) {
      const partner = partners.get(sender);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    
      if (!text) {
        return sock.sendMessage(sender, {
          text: '❗ In anonymen Chats sind nur Textnachrichten erlaubt.'
        });
      }
    
      return sock.sendMessage(partner, {
        text: `💬 *Anonymer Partner:*\n${text}`
      });
    }
    











    // Keine Gruppen, nur private Chats
    if (sender.endsWith('@g.us')) {
      return;
    }

    // Prüfen ob Nachricht Text, Bild, Sticker, etc.
    let messageText = '';
    const messageType = Object.keys(msg.message)[0];

    if (messageType === 'conversation') messageText = msg.message.conversation;
    else if (messageType === 'extendedTextMessage') messageText = msg.message.extendedTextMessage.text;
    else if (messageType === 'imageMessage') {
      messageText = '[Bild]';
    } else if (messageType === 'stickerMessage') {
      messageText = '[Sticker]';
    } else {
      messageText = '[Nicht unterstützter Nachrichtentyp]';
    }

    console.log(`📩 Nachricht von ${sender}: ${messageText}`);

    const lower = messageText.toLowerCase();

    // Wenn User verbunden ist, nur Text erlauben
    if (partners.has(sender)) {
      if (messageType !== 'conversation' && messageType !== 'extendedTextMessage') {
        await sock.sendMessage(sender, { text: '❗ Während einer anonymen Verbindung sind nur Textnachrichten erlaubt. Bitte keine Bilder oder Sticker senden.' });
        return;
      }
    }

    if (lower === '.find') {
      if (partners.has(sender)) {
        await sock.sendMessage(sender, {
          text:
`🤖 *Beta Bot*
✅ Du bist bereits verbunden.
.exit zum Verlassen
.find zum neuen Partner suchen`
        });
        return;
      }

      if (waitingQueue.includes(sender)) {
        await sock.sendMessage(sender, { text: '⏳ Du suchst bereits nach einem Partner, bitte warte...' });
        return;
      }

      if (waitingQueue.length === 0) {
        waitingQueue.push(sender);
        await sock.sendMessage(sender, { text: '⏳ Suche nach einem anonymen Partner (max. 30 Sekunden)...' });

        const timeout = setTimeout(async () => {
          const index = waitingQueue.indexOf(sender);
          if (index !== -1) {
            waitingQueue.splice(index, 1);
            searchTimeouts.delete(sender);
            await sock.sendMessage(sender, { text: '❌ Es wurde kein Partner gefunden. Bitte versuche es später erneut.' });
          }
        }, 30000);

        searchTimeouts.set(sender, timeout);

      } else {
        // Partner finden
        const partner = waitingQueue.shift();

        // Timeout für Partner löschen
        if (searchTimeouts.has(partner)) {
          clearTimeout(searchTimeouts.get(partner));
          searchTimeouts.delete(partner);
        }

        partners.set(sender, partner);
        partners.set(partner, sender);

        // Profilbilder holen
        const senderPic = await getProfilePicture(sender);
        const partnerPic = await getProfilePicture(partner);

        // Partner über Verbindung informieren mit Profilbild (wenn vorhanden)
        await sock.sendMessage(sender, {
          text:
`🤖 *Beta Bot*
✅ Partner gefunden! Du kannst jetzt anonym chatten.
.exit zum Verlassen
.find zum neuen Partner suchen`,
          ...(partnerPic ? { image: { url: partnerPic }, caption: 'Dein anonymer Partner' } : {})
        });

        await sock.sendMessage(partner, {
          text:
`🤖 *Beta Bot*
✅ Partner gefunden! Du kannst jetzt anonym chatten.
.exit zum Verlassen
.find zum neuen Partner suchen`,
          ...(senderPic ? { image: { url: senderPic }, caption: 'Dein anonymer Partner' } : {})
        });
      }
      return;
    }

    if (lower === '.exit') {
      if (!partners.has(sender)) {
        await sock.sendMessage(sender, { text: '❗ Du bist mit keinem Partner verbunden.' });
        return;
      }

      const partner = partners.get(sender);
      partners.delete(sender);
      partners.delete(partner);

      await sock.sendMessage(sender, { text: '❌ Du hast die Verbindung beendet.' });
      await sock.sendMessage(partner, { text: '❌ Dein Partner hat die Verbindung getrennt.' });

      return;
    }

    // Nachrichten an Partner weiterleiten (nur Text)
    if (partners.has(sender)) {
      const partner = partners.get(sender);
      await sock.sendMessage(partner, { text: `💬 Anonymer Chat:\n${messageText}` });
      return;
    }

    // Optional: Hinweismeldung wenn nicht verbunden
    // await sock.sendMessage(sender, { text: 'Schreibe .find um einen anonymen Partner zu suchen.' });
  });

  sock.ev.on('creds.update', saveCreds);
}

start().catch(console.error);
