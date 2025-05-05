// src/app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const AuthController = require('./controllers/authController');
const UserController = require('./controllers/userController');
const AgendaController = require('./controllers/agendaController');
const VoteController = require('./controllers/VoteController');
const { isAuthenticated, isAdmin } = require('./middleware/auth');



// Middleware
app.set('view engine', 'ejs'); // Ensure view engine is set to 'ejs'
app.set('views', path.join(__dirname, 'views')); // Ensure views directory is correctly set
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// display front end
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Join room based on user ID
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Middleware to make io available in the request object
app.set('io', io);


// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', AuthController.showLogin);
app.post('/login', AuthController.login);
app.get('/logout', AuthController.logout);

app.get('/dashboard', isAuthenticated, AuthController.showDashboard); 

app.get('/voting', isAuthenticated, VoteController.showVoting);
app.post('/vote', isAuthenticated, VoteController.createVote);

// User management routes (admin only)
app.get('/users/manage', isAuthenticated, isAdmin, UserController.showUserManagement);
app.post('/users/create', isAuthenticated, isAdmin, UserController.createUser);
app.get('/sessions/create', isAuthenticated, isAdmin, UserController.createSession);
app.get('/voting/results', isAuthenticated, VoteController.showResults);

// Agenda management routes (admin only)
app.get('/users/agenda', isAuthenticated, isAdmin, AgendaController.showAgendas);
app.post('/create/agenda', isAuthenticated, isAdmin, AgendaController.createAgenda);
app.delete('/agendas/:id', isAuthenticated, isAdmin, AgendaController.deleteAgenda);

// Pending users routes
app.post('/users/approve/:id', isAuthenticated, isAdmin, UserController.approveUser);
app.post('/users/deny/:id', isAuthenticated, isAdmin, UserController.denyUser);


app.put('/users/:id', isAuthenticated, isAdmin, UserController.updateUser);
app.delete('/users/:id', isAuthenticated, isAdmin, UserController.deleteUser);

// Start server
const PORT = process.env.PORT || 7777;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
