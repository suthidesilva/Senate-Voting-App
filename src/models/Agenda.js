const { getDb } = require('../config/database');
const bcrypt = require('bcrypt');

class Agenda {
    static async getAll() {
        try {
            const db = await getDb();
            const agendas = await db.all('SELECT * FROM agendas');
            return agendas;
        } catch (error) {
            console.error('Error fetching agendas:', error);
            throw error;
        }
    }

    static async create(agendaData) {
        try {
            const db = await getDb();
            const result = await db.run(
                `INSERT INTO agendas (agenda_id, session_id, title, created_at, created_by) VALUES (?, ?, ?, ?, ?)`,
                [agendaData.agenda_id, agendaData.session_id, agendaData.title, agendaData.date_time, agendaData.created_by]
            );
            return result.lastID;
        } catch (error) {
            console.error('Error creating agenda:', error);s
            throw error;
        }
    }

    static async delete(id) {
        try {
            const db = await getDb();
            await db.run('DELETE FROM agendas WHERE agenda_id = ?', id);
        } catch (error) {
            console.error('Error deleting agenda:', error);
            throw error;
        }
    }
}

module.exports = Agenda;
