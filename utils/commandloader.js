const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

global.commands = new Map();

function loadCommands() {
    const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

    console.log(chalk.magenta('\n📦 Lade Commands:'));

    for (const file of commandFiles) {
        try {
            const command = require(`../commands/${file}`);
            const name = path.basename(file, '.js');
            global.commands.set(name, command);
            console.log(chalk.green(`✅ ${name}`));
        } catch (err) {
            console.log(chalk.red(`❌ Fehler beim Laden von ${file}:`, err.message));
        }
    }
}

module.exports = { loadCommands };
