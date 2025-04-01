const Agenda = require('../models/Agenda');

class AgendaController {
    static async showAgendas(req, res) {
        try {
            const agendas = await Agenda.getAll();
            res.render('users/agenda', { 
                agendas,
                error: null,
                user: req.session.user
            });
        } catch (error) {
            res.render('users/agenda', { 
                agendas: [], 
                error: 'Failed to fetch agendas',
                user: req.session.user
            });
        }
    }

    static async createAgenda(req, res) {
        try {
            const { agendaId, agendaTitle, agendaDateTime } = req.body;
            await Agenda.create({
                agenda_id: agendaId,
                session_id: req.session.currentSession,
                title: agendaTitle,
                date_time: agendaDateTime,
                session_id: req.session.currentSession,
                created_by: req.session.userId
            });
            res.redirect('/users/agenda');
        } catch (error) {
            console.error('Error creating session:', error);
            res.status(500).send('Error creating session');
        }
    }

    static async showCreateForm(req, res) {
        try {
            const agendas = await Agenda.getAll();
            res.render('users/agenda', { 
                agendas,
                error: null,
                user: req.session.user 
            });
        } catch (error) {
            res.render('users/agenda', {
                agendas: [],
                error: 'Failed to load agendas',
                user: req.session.user
            });
        }
    }

    static async deleteAgenda(req, res) {
        try {
            const agendaId = req.params.id;
            await Agenda.delete(agendaId);
            return res.json({ success: true });
        } catch (error) {
            console.error('Error deleting agenda:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete agenda' 
            });
        }
    }

    static async delete(id) {
        try {
            const db = await getDb();
            const result = await db.run(
                'DELETE FROM agendas WHERE agenda_id = ?',
                [id]
            );
            if (result.changes === 0) {
                throw new Error('Agenda not found');
            }
            return true;
        } catch (error) {
            console.error('Error deleting agenda:', error);
            throw error;
        }
    }
}

module.exports = AgendaController;
