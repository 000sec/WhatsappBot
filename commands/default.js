module.exports = {
    name: 'default',
    execute: async (msg, db, sock) => {
      const sender = msg.key.remoteJid;
      await sock.sendMessage(sender, { text: 'Das ist die Standardantwort für unbekannte Befehle.' });
    }
  };
  