const User = require('../models/User');

class UserController {
    static async showUserManagement(req, res) {
        try {
            const users = await User.getAllUsers();
            const userId = req.session.userId;
            // Optionally verify user role
            const user = await User.findById(userId);
            res.render('users/manage', { 
                users,
                user: req.user || null,  // Add user from request
                error: null
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send('Error loading user management page');
        }
    }

    static async updateUser(req, res) {
        const userId = parseInt(req.params.id, 10);
        try {
            const userData = {
            role_name: req.body.role_name,
            committee_name: req.body.committee_name,
            is_admin: !!req.body.is_admin,
            is_committee_chair: !!req.body.is_committee_chair,
            is_active: !!req.body.is_active
            };
            await User.updateUser(userId, userData);
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating user:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteUser(req, res) {
        const userId = parseInt(req.params.id, 10);
        try {
            await User.deleteUser(userId);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting user:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async createUser(req, res) {
        try {
            const userData = {
                name: req.body.name,
                username: req.body.username,
                password: req.body.password,
                role_name: req.body.role_name,
                committee_name: req.body.committee_name || null,
                is_admin: Boolean(req.body.is_admin),
                is_committee_chair: Boolean(req.body.is_committee_chair),
                is_active: true
            };

            await User.createUser(userData);
            res.redirect('/users/manage');
        } catch (error) {
            console.error('Error creating user:', error);
            const users = await User.getAllUsers();
            
            // Send both the error message and the users list back to the template
            res.render('users/manage', { 
                error: error.message,
                users: users,
                user: req.user || null
            });
        }
    }


    static async createSession(req, res) {
        try {
          const userId = req.session.userId;
          // Optionally verify user role
          const user = await User.findById(userId);
          if (!['Secretary', 'VicePresident'].includes(user.role_name)) {
            throw new Error('Must be Secretary or VicePresident to create session');
          }
          await User.createSession({ created_by: userId });
          res.redirect('/dashboard');
        } catch (error) {
          console.error('Error creating session:', error);
          res.status(500).send('Error creating session');
        }
    }

    static async createAgenda(req, res) {
        try {
            const userData = {
                agenda_id: req.body.agenda_id,
                session_id: req.body.session_id,
                title: req.body.title,
                created_by: userId
            };

            await User.createAgenda(userData);
            res.redirect('/agenda/create');
        } catch (error) {
            console.error('Error creating agenda:', error);
            res.status(500).send('Error creating agenda');
        }
    }

    static async showPendingUsers(req, res) {
        try {
            const pending = Array.from(User.pendingUsers);
            const users = await User.getUsersByIds(pending);
            res.render('users/manage_pending', { users });
        } catch (error) {
            console.error('Error fetching pending users:', error);
            res.status(500).send('Error fetching pending users');
        }
    }

    static async approveUser(req, res) {
        const userId = parseInt(req.params.id, 10);
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
    
            await User.approveUser(userId);
    
            // Emit events
            req.app.get('io').emit('userApproved', { userId });
            req.app.get('io').to(`user_${userId}`).emit('approved', {
                userId: user.user_id,
                username: user.username,
                isAdmin: user.is_admin
            });
    
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Error approving user:', error);
            res.status(500).send('Error approving user');
        }
    }

    static async denyUser(req, res) {
        const userId = parseInt(req.params.id, 10);
        try {
            await User.denyUser(userId);
            // Emit event to update admin dashboard
            req.app.get('io').emit('userDenied', { userId });
            // Emit event to the specific user to notify denial
            req.app.get('io').to(`user_${userId}`).emit('denied');
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Error denying user:', error);
            res.status(500).send('Error denying user');
        }
    }
}

module.exports = UserController;
