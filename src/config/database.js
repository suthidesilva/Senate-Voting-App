const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

let db = null;

async function getDb() {
    if (db) return db;

    db = await open({
        filename: 'senate_voting.db',
        driver: sqlite3.Database
    });

    return db;
}

module.exports = { getDb };