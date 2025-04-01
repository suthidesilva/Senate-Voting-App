const { getDb } = require('../config/database');
const bcrypt = require('bcrypt');

const ALLOWED_ROLES = ['Senator', 'President', 'Vice President', 'Pro Tempore', 'Secretary'];
const ALLOWED_COMMITTEES = [
    'Executive Council',
    'Finance',
    'Code and Constitution Evaluation',
    'Campus Life',
    'Campus Quality and Sustainability',
    'Community Relations',
    'Organizations and Outreach'
];

// Password requirements
const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true
};

// Rate limiting
const LOGIN_ATTEMPTS = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes

// src/models/User.js 
class User {
    static pendingUsers = new Set();
    static deniedUsers = new Map(); // userId -> timestamp

    static isDenied(userId) {
        if (!this.deniedUsers.has(userId)) return false;
        const deniedTime = this.deniedUsers.get(userId);
        const now = Date.now();
        // Check if 30 seconds have passed
        if (now - deniedTime >= 30000) {
            this.deniedUsers.delete(userId);
            return false;
        }
        return true;
    }

    static async addPendingUser(userId) {
        this.pendingUsers.add(userId);
    }    

    static async approveUser(userId) {
        try {
            this.pendingUsers.delete(userId);
            // Update user's active status in DB if needed
            const db = await getDb();
            await db.run('UPDATE users SET is_active = 1 WHERE user_id = ?', [userId]);
        } catch (error) {
            console.error('Error approving user:', error);
            throw error;
        }
    }

    static async denyUser(userId) {
        this.pendingUsers.delete(userId);
        this.deniedUsers.set(userId, Date.now());
    }

    static getPendingUserIds() {
        return Array.from(this.pendingUsers);
    }

    static async getUsersByIds(userIds) {
        try {
            const db = await getDb();
            const placeholders = userIds.map(() => '?').join(',');
            const users = await db.all(
                `SELECT * FROM users WHERE user_id IN (${placeholders})`,
                userIds
            );
            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const db = await getDb();
            const user = await db.get(
                'SELECT * FROM users WHERE username = ?',
                username
            );
            return user;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static async findById(userId) {
        try {
            const db = await getDb();
            const user = await db.get(
                'SELECT * FROM users WHERE user_id = ?',
                userId
            );
            return user;
        } catch (error) {
            console.error('Error finding user:', error);
            throw error;
        }
    }

    static validatePassword(password) {
        if (password.length < PASSWORD_REQUIREMENTS.minLength) {
            throw new Error(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
        }
        if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
            throw new Error('Password must contain at least one number');
        }
        if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            throw new Error('Password must contain at least one special character');
        }
        return true;
    }

    static async createUser(userData) {
        if (!ALLOWED_ROLES.includes(userData.role_name)) {
            throw new Error('Invalid role name');
        }
        if (userData.committee_name && !ALLOWED_COMMITTEES.includes(userData.committee_name)) {
            throw new Error('Invalid committee name');
        }
        try {
            // Validate password complexity
            this.validatePassword(userData.password);
            
            const db = await getDb();
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const result = await db.run(
                `INSERT INTO users (name, username, password_hash, role_name, 
                    committee_name, is_admin, is_committee_chair, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.name,
                    userData.username,
                    hashedPassword,
                    userData.role_name,
                    userData.committee_name,
                    userData.is_admin ? 1 : 0,
                    userData.is_committee_chair ? 1 : 0,
                    userData.is_active ? 1 : 0
                ]
            );
            return result.lastID;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    
    static async createAgenda(userData) {
        try {
            const db = await getDb();
            const result = await db.run(
                `INSERT INTO agenda (name, username, password_hash, role_name, 
                    committee_name, is_admin, is_committee_chair, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userData.name,
                    userData.username,
                    hashedPassword,
                    userData.role_name,
                    userData.committee_name,
                    userData.is_admin ? 1 : 0,
                    userData.is_committee_chair ? 1 : 0,
                    userData.is_active ? 1 : 0
                ]
            );
            return result.lastID;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
    static async createSession(userData) {
        try {
            const db = await getDb();
            
            // Check for existing ongoing session
            const existingSession = await db.get(
                'SELECT status FROM sessions ORDER BY rowid DESC LIMIT 1'
            );
            
            // If there's an existing session and it's ongoing, throw error
            if (existingSession && existingSession.status === 'ongoing') {
                throw new Error('Session already exists');
            }
            
            // If no session exists or previous session is not ongoing, create new session
            const result = await db.run(
                `INSERT INTO sessions (created_by) VALUES (?)`,
                [userData.created_by]
            );
            
            return result.lastID;
    
        } catch (error) {
          console.error('Error creating session:', error);
          throw error;
        }
    }

    static async createSession(userData) {
        try {
          const db = await getDb();
          const row = await db.get('SELECT status FROM sessions ORDER BY rowid DESC LIMIT 1');
          // Only fail if row exists and status is ongoing
          if (row && row.status === 'ongoing') {
            throw new Error('Session already exists');
          }
          const result = await db.run(
            'INSERT INTO sessions (created_by) VALUES (?)',
            [userData.created_by]
          );
          return result.lastID;
        } catch (error) {
          console.error('Error creating session:', error);
          throw error;
        }
    }
    
    static async verifySession(){
        try {
            const db = await getDb();
            const result = await db.get(
                'SELECT status FROM sessions ORDER BY rowid DESC LIMIT 1',
            );
            return result.status
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }

    static async updateUser(userId, userData) {
        if (userData.role_name && !ALLOWED_ROLES.includes(userData.role_name)) {
            throw new Error('Invalid role name');
        }
        if (userData.committee_name && !ALLOWED_COMMITTEES.includes(userData.committee_name)) {
            throw new Error('Invalid committee name');
        }

        try {
            const db = await getDb();
            const result = await db.run(
                `UPDATE users 
                SET role_name = ?,
                    committee_name = ?,
                    is_admin = ?,
                    is_committee_chair = ?,
                    is_active = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?`,
                [
                    userData.role_name,
                    userData.committee_name,
                    userData.is_admin ? 1 : 0,
                    userData.is_committee_chair ? 1 : 0,
                    userData.is_active ? 1 : 0,
                    userId
                ]
            );

            if (result.changes === 0) {
                throw new Error('User not found');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async deleteUser(userId) {
        try {
          const db = await getDb();
          const result = await db.run('DELETE FROM users WHERE user_id = ?', [userId]);
          if (result.changes === 0) {
            throw new Error('User not found');
          }
        } catch (error) {
          console.error(`Error deleting user with ID ${userId}:`, error.message);
          throw error;
        }
    }

    static async sessionCreator() {
        try {
            const db = await getDb();
            const result = await db.get(
                'SELECT created_by FROM sessions WHERE status = "ongoing" ORDER BY rowid DESC LIMIT 1'
            );
            return result ? result.created_by : null;
        } catch (error) {
            console.error('Error getting session creator:', error);
            throw error;
        }
    }

    static async sessionEnd(){
        try {
            const db = await getDb();
            const result = await db.run(
                'UPDATE sessions SET status = "finished" WHERE status = "ongoing"'
            );
            return result.lastID;
        } catch (error) {
            console.error('Error updating session status:', error);
            throw error;
        }
    }

    static async attendance(user_id,session_id){
        try {
            const db = await getDb();
            const exist = await this.checkattendance(user_id,session_id);
            if(!exist){
                const users = await db.all(
                    'INSERT INTO attendance (user_id, session_id) VALUES (?,?)',
                    [user_id,session_id]
                );
                return users;
            }
            else{
                return null;
            }
            

        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }  
    }
    static async checkattendance(user_id,session_id){
        try {
            const db = await getDb();
            const result = await db.get(
                'SELECT * FROM attendance WHERE user_id =? AND session_id =?',
                [user_id,session_id]
            );
            return result;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }
    static async sessionEnd(){
        try {
            const db = await getDb();
            const result = await db.run(
                'UPDATE sessions SET status = "finished" WHERE status = "ongoing"'
            );
            return result.lastID;
        } catch (error) {
            console.error('Error updating session status:', error);
            throw error;
        }
    }

    static async attendance(user_id,session_id){
        try {
            const db = await getDb();
            const exist = await this.checkattendance(user_id,session_id);
            if(!exist){
                const users = await db.all(
                    'INSERT INTO attendance (user_id, session_id) VALUES (?,?)',
                    [user_id,session_id]
                );
                return users;
            }
            else{
                return null;
            }
            

        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }  
    }
    static async checkattendance(user_id,session_id){
        try {
            const db = await getDb();
            const result = await db.get(
                'SELECT * FROM attendance WHERE user_id =? AND session_id =?',
                [user_id,session_id]
            );
            return result;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    static async getAllUsers() {
        try {
            const db = await getDb();
            const users = await db.all(
                'SELECT user_id, name, username, role_name, committee_name, is_admin, is_committee_chair, is_active FROM users'
            );
            return users;
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }
    static async getCurrentSession(){
        try {
            const db = await getDb();
            const result = await db.get(
                'SELECT session_id FROM sessions ORDER BY rowid DESC LIMIT 1'
            );
            return result.session_id;
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }
    static async getActiveSessions() {
        // Implementation to get all active sessions from your session store
        // Return array of session objects
        return await SessionStore.find({ active: true });
    }
    
    static async terminateSession(sessionId) {
        // Implementation to terminate a specific session
        // This could involve marking it as inactive in the store
        // or removing it entirely
        return await SessionStore.terminate(sessionId);
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    }

    static isUserLocked(username) {
        const attempts = LOGIN_ATTEMPTS.get(username);
        if (!attempts) return false;
        
        if (attempts.count >= MAX_LOGIN_ATTEMPTS && 
            Date.now() - attempts.lastAttempt < LOCKOUT_TIME) {
            return true;
        }
        
        if (Date.now() - attempts.lastAttempt >= LOCKOUT_TIME) {
            LOGIN_ATTEMPTS.delete(username);
            return false;
        }
        
        return false;
    }

    static recordLoginAttempt(username, success) {
        let attempts = LOGIN_ATTEMPTS.get(username) || { count: 0, lastAttempt: 0 };
        
        if (success) {
            LOGIN_ATTEMPTS.delete(username);
            return;
        }

        attempts.count += 1;
        attempts.lastAttempt = Date.now();
        LOGIN_ATTEMPTS.set(username, attempts);
    }
}

module.exports = User;
