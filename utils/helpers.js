const chalk = require('chalk');
const { getCommand } = require('./commandLoader');

async function handleCommand(sock, sender, commandText) {
    const commandName = commandText.split(' ')[0].substring(1).toLowerCase();

    console.log(
        chalk.yellow(`[📥] ${sender} führt Befehl aus: !${commandName}`)
    );

    const command = getCommand(commandName);
    if (command) {
        await command(sock, sender);
    } else {
        const fallback = getCommand('default');
        if (fallback) await fallback(sock, sender);
    }
}

module.exports = { handleCommand };
