const { getDb } = require('../config/database');



class Vote {
    static async findAgenda(agenda_id) {
        try {
            const db = await getDb();
            const agenda = await db.get(
                'SELECT * FROM agendas WHERE agenda_id = ?',
                agenda_id
            );
            return agenda;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async createVoting(agenda_id, user_id, vote){
        try {
            const db = await getDb();
            await db.run(
            'INSERT INTO votes (agenda_id, user_id, vote) VALUES (?, ?, ?)',
            [agenda_id, user_id, vote]
            );
            return true;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }

    }
}

module.exports = Vote;