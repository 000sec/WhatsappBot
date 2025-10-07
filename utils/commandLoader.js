// utils/commandLoader.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const commandMap = new Map();

function loadCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    const files = fs.readdirSync(commandsDir);

    console.log(chalk.blue('\n📦 Lade Commands:'));
    for (const file of files) {
        if (file.endsWith('.js')) {
            const commandName = file.replace('.js', '');
            try {
                const command = require(path.join(commandsDir, file));
                commandMap.set(commandName, command);
                console.log(chalk.green(`✅ ${commandName}`));
            } catch (err) {
                console.log(chalk.red(`❌ ${commandName} – Fehler beim Laden: ${err.message}`));
            }
        }
    }
    console.log(); // Leerzeile
}

function getCommand(name) {
    return commandMap.get(name);
}

module.exports = { loadCommands, getCommand };
