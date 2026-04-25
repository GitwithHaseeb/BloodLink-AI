import jwt from "jsonwebtoken";

const requestCounts = new Map();

export const rateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 60;

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }

    const userRequests = requestCounts.get(ip);

    if (now > userRequests.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }

    if (userRequests.count >= maxRequests) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    userRequests.count += 1;
    next();
};

export const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You are not allowed to perform this action" });
    }
    next();
};

export const validateRegister = (req, res, next) => {
    const { name, email, password, role, city, bloodGroup, hospitalName } = req.body;
    const validRoles = ["donor", "hospital"];
    const validBloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

    if (!name || !email || !password || !role || !city) {
        return res.status(400).json({ message: "name, email, password, role, and city are required" });
    }
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "role must be donor or hospital" });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "password must be at least 6 characters" });
    }
    if (role === "donor" && !validBloodGroups.includes(String(bloodGroup || "").toUpperCase())) {
        return res.status(400).json({ message: "valid donor bloodGroup is required" });
    }
    if (role === "hospital" && !hospitalName) {
        return res.status(400).json({ message: "hospitalName is required for hospital accounts" });
    }

    next();
};

// Validate donor request body
export const validateDonor = (req, res, next) => {
    const { name, bloodGroup, age, city, contact, email } = req.body;

    if (!name || String(name).trim() === '') {
        return res.status(400).json({ error: 'Name is required' });
    }

    if (!bloodGroup || String(bloodGroup).trim() === '') {
        return res.status(400).json({ error: 'Blood group is required' });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    if (!validBloodGroups.includes(String(bloodGroup).toUpperCase().trim())) {
        return res.status(400).json({ error: 'Invalid blood group. Valid options: A+, A-, B+, B-, O+, O-, AB+, AB-' });
    }

    if (age !== undefined && age !== null) {
        const ageNum = Number(age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
            return res.status(400).json({ error: 'Age must be between 18 and 65' });
        }
    }

    if (email !== undefined && email !== null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(email))) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
    }

    if (!city || String(city).trim() === '') {
        return res.status(400).json({ error: 'City is required' });
    }

    if (!contact || String(contact).trim() === '') {
        return res.status(400).json({ error: 'Contact is required' });
    }

    next();
};

// Validate hospital request body
export const validateHospital = (req, res, next) => {
    const { hospitalName, bloodGroup, city, contact, email } = req.body;

    if (!hospitalName || String(hospitalName).trim() === '') {
        return res.status(400).json({ error: 'Hospital name is required' });
    }

    const bg = req.body.bloodGroup || req.body.bloodGroupNeeded;
    if (!bg || String(bg).trim() === '') {
        return res.status(400).json({ error: 'Blood group needed is required' });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    if (!validBloodGroups.includes(String(bg).toUpperCase().trim())) {
        return res.status(400).json({ error: 'Invalid blood group. Valid options: A+, A-, B+, B-, O+, O-, AB+, AB-' });
    }

    if (email !== undefined && email !== null) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(email))) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
    }

    if (!city || String(city).trim() === '') {
        return res.status(400).json({ error: 'City is required' });
    }

    if (!contact || String(contact).trim() === '') {
        return res.status(400).json({ error: 'Contact is required' });
    }

    next();
};

