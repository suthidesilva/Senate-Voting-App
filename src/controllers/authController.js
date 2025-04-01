// src/controllers/authController.js
const User = require('../models/User');

class AuthController {
    static async showLogin(req, res) {
        if (req.session.userId) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', { 
            error: null,
            query: req.query 
        });
    }

    static async login(req, res) {
        try {
            // Handle approved login from waiting room
            if (req.body.approved && req.body.userId) {
                console.log('Handling approved login for user ID:', req.body.userId);
                const user = await User.findById(req.body.userId);
                
                if (!user) {
                    return res.status(400).json({ error: 'User not found' });
                }

                // Set up session for approved user
                req.session.userId = user.user_id;
                req.session.isAdmin = user.is_admin;
                req.session.username = user.username;

                // Save the session before responding
                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.status(500).json({ error: 'Session error occurred' });
                    }
                    console.log('Session saved for user ID:', user.user_id);
                    return res.json({ success: true });
                });
                return;
            }

            // Standard login flow
            const { username, password } = req.body;
            
            // Check for account lockout
            if (User.isUserLocked(username)) {
                return res.render('auth/login', {
                    error: 'Account is temporarily locked. Please try again later.',
                    query: req.query
                });
            }

            console.log('Login attempt for username:', username);
            const user = await User.findByUsername(username);
            
            if (!user || !user.is_active) {
                User.recordLoginAttempt(username, false);
                return res.render('auth/login', { 
                    error: 'Invalid credentials or inactive account',
                    query: req.query
                });
            }

            const isValid = await User.verifyPassword(password, user.password_hash);
            if (!isValid) {
                User.recordLoginAttempt(username, false);
                return res.render('auth/login', { 
                    error: 'Invalid credentials',
                    query: req.query
                });
            }

            // Record successful login
            User.recordLoginAttempt(username, true);

            if (user.is_admin) {
                // Admin user login with enhanced session security
                req.session.userId = user.user_id;
                req.session.isAdmin = true;
                req.session.username = user.username;
                req.session.userAgent = req.headers['user-agent'];
                req.session.lastActivity = Date.now();

                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res.render('auth/login', { 
                            error: 'Session error occurred',
                            query: req.query
                        });
                    }
                    console.log('Admin session saved for user ID:', user.user_id);
                    return res.redirect('/dashboard');
                });

                return;
            }

            // Non-admin user login
            const sessionStatus = await User.verifySession();
            if (sessionStatus !== 'ongoing') {
                return res.render('auth/login', {
                    error: 'No active session is running. Please wait for an administrator to start one.',
                    query: req.query
                });
            }

            // Add user to pending users
            await User.addPendingUser(user.user_id);
            console.log('User ID', user.user_id, 'added to pending users.');

            // Emit socket event for new pending user
            req.app.get('io').emit('newPendingUser', {
                user_id: user.user_id,
                name: user.name,
                username: user.username,
                role_name: user.role_name
            });

            // Render waiting room
            res.render('auth/waiting', { 
                username: user.username,
                user_id: user.user_id,
                message: 'Please wait for an administrator to verify your access.'
            });

        } catch (error) {
            console.error('Login error:', error);
            res.render('auth/login', { 
                error: 'An error occurred during login',
                query: req.query
            });
        }
    }

    static async showDashboard(req, res) {
        try {
            const user = await User.findById(req.session.userId);
            let pendingUsers = [];
            if (user.is_admin) {
                const pendingIds = User.getPendingUserIds();
                pendingUsers = await User.getUsersByIds(pendingIds);
            }
            res.render('dashboard', { user, pendingUsers });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.redirect('/login');
        }
    }

    static async logout(req, res) {
        try {
            const session_creator = await User.sessionCreator();
            const userId = req.session.userId;
            
            if (session_creator && userId && Number(userId) === Number(session_creator)) {
                await User.sessionEnd();
                console.log('Session ended by creator');
            }
    
            req.session.destroy((err) => {
                if (err) {
                    console.error('Logout error:', err);
                }
                res.redirect('/login');
            });
    
        } catch (error) {
            console.error('Logout error:', error);
            res.redirect('/login');
        }
    }

    static async user_dashboard(req, res) {
        try {
            const user = await User.findById(req.session.userId);
            const sessionStatus = await User.verifySession();
            const agendas = await User.getAgendas();
            
            res.render('user_dashboard', {
                user,
                isAdmin: req.session.isAdmin,
                sessionStatus,
                agendas
            });
        } catch (error) {
            console.error('User dashboard error:', error);
            res.redirect('/login');
        }
    }
}

module.exports = AuthController;
