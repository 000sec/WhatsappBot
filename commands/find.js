const { findPartner } = require('../chatPairs');

module.exports = {
  name: 'find',
  execute: async (msg, db, sock) => {
    const sender = msg.key.remoteJid;
    const found = await findPartner(sender);
    if (found) {
      await sock.sendMessage(sender, { text: '✅ Du bist jetzt anonym verbunden.' });
      await sock.sendMessage(found, { text: '✅ Du bist jetzt anonym verbunden.' });
    } else {
      await sock.sendMessage(sender, { text: '⏳ Warte auf einen Partner...' });
    }
  }
};
