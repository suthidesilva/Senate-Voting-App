const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function isAuthenticated(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }

    // Check for session timeout
    const currentTime = Date.now();
    if (req.session.lastActivity && 
        currentTime - req.session.lastActivity > SESSION_TIMEOUT) {
        req.session.destroy();
        return res.redirect('/login?timeout=true');
    }

    // Check for potential session hijacking
    if (req.session.userAgent && 
        req.session.userAgent !== req.headers['user-agent']) {
        req.session.destroy();
        return res.redirect('/login?security=true');
    }

    // Update last activity
    req.session.lastActivity = currentTime;
    return next();
}

function isAdmin(req, res, next) {
    if (!req.session || !req.session.isAdmin) {
        return res.status(403).send('Access denied');
    }

    // Additional security checks for admin sessions
    const currentTime = Date.now();
    if (req.session.lastActivity && 
        currentTime - req.session.lastActivity > SESSION_TIMEOUT) {
        req.session.destroy();
        return res.redirect('/login?timeout=true');
    }

    if (req.session.userAgent && 
        req.session.userAgent !== req.headers['user-agent']) {
        req.session.destroy();
        return res.redirect('/login?security=true');
    }

    req.session.lastActivity = currentTime;
    return next();
}

module.exports = {
    isAuthenticated,
    isAdmin
};