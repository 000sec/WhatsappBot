module.exports = {
    name: 'exit',
    execute: async (msg, db, sock) => {
      const sender = msg.key.remoteJid;
      await sock.sendMessage(sender, { text: 'Bot wird jetzt beendet...' });
      process.exit(0);
    }
  };
  