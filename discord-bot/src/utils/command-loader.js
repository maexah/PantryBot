/**
 * Loads all static command modules from a directory.
 */

const fs = require('fs');
const path = require('path');

function loadCommands(commandsDir) {
    const commands = [];

    if (!fs.existsSync(commandsDir)) {
        console.warn(`[Loader] Commands directory not found: ${commandsDir}`);
        return commands;
    }

    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const filePath = path.join(commandsDir, file);
        const command = require(filePath);

        if (!command.data || !command.execute) {
            console.warn(`[Loader] Skipping ${file}: missing 'data' or 'execute' export`);
            continue;
        }

        commands.push(command);
    }

    return commands;
}

module.exports = { loadCommands };
