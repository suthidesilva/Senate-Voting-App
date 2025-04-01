const path = require('path');
console.log('Looking for Vote.js at:', path.join(__dirname, '../models/Vote.js'));
const Vote = require('../models/Vote');
const User = require('../models/User');
const { getDb } = require('../config/database');

class VoteController {
    static async showVoting(req, res) {
        try {
            const db = await getDb();
            const agenda = await db.get('SELECT * FROM agendas ORDER BY rowid DESC LIMIT 1');

            if (!agenda) {
                return res.render('users/voting', { 
                    error: 'No active agenda available',
                    agenda: null,
                    user: null
                });
            }

            const user = await User.findById(req.session.userId);
            
            // Check if user has already voted
            const existingVote = await db.get(
                'SELECT vote FROM votes WHERE agenda_id = ? AND user_id = ?',
                [agenda.agenda_id, user.user_id]
            );

            if (existingVote) {
                return res.render('users/voting', { 
                    error: 'You have already voted on this agenda',
                    agenda,
                    user,
                    voted: true,
                    previousVote: existingVote.vote
                });
            }
            
            res.render('users/voting', { 
                agenda,
                user,
                error: null,
                voted: false
            });
        } catch (error) {
            console.error('Error loading voting page:', error);
            res.status(500).send('Error loading voting page');
        }
    }

    static async createVote(req, res) {
        const { agenda_id, user_id, vote } = req.body;
        try {
            const db = await getDb();
            // Check for existing vote
            const existingVote = await db.get(
                'SELECT vote FROM votes WHERE agenda_id = ? AND user_id = ?',
                [agenda_id, user_id]
            );

            if (existingVote) {
                return res.status(400).send('You have already voted on this agenda');
            }

            await Vote.createVoting(agenda_id, user_id, vote);
            
            // After successful vote, get updated results
            const results = await db.get('SELECT * FROM voting_results_view WHERE agenda_id = ?', agenda_id);
            
            // Emit the updated results to all connected clients
            req.app.get('io').emit('voteUpdate', results);
            
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Error creating vote:', error);
            if (error.code === 'SQLITE_CONSTRAINT') {
                res.status(400).send('You have already voted on this agenda');
            } else {
                res.status(500).send('Error creating vote');
            }
        }
    }

    static async showResults(req, res) {
        try {

            const db = await getDb();
            const agenda = await db.get('SELECT agenda_id FROM agendas ORDER BY rowid DESC LIMIT 1');
            const results = await db.all('SELECT * FROM voting_results_view WHERE agenda_id = ?', agenda.agenda_id);
            const session = await db.get('SELECT datetime FROM sessions ORDER BY rowid DESC LIMIT 1');
            const userId = req.session.userId;
            // Optionally verify user role
            const user = await User.findById(userId);
            res.render('users/vote_result', { 
                results: results || [],
                session: session || null,
                user: req.user || null,  // Add user from request
                error: null
            });
        } catch (error) {
            console.error('Error loading voting results:', error);
            res.status(500).send('Error loading voting results');
        }
    }
}

module.exports = VoteController;