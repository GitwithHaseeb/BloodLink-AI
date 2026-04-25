import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/sqlite.js";

const signToken = (user) =>
    jwt.sign(
        {
            id: String(user.id),
            role: user.role,
            city: user.city
        },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "7d" }
    );

const mapUserRow = (row) => ({
    id: row.id,
    role: row.role,
    name: row.name,
    email: row.email,
    city: row.city,
    contact: row.contact,
    location:
        row.lat == null || row.lng == null
            ? undefined
            : {
                  lat: row.lat,
                  lng: row.lng
              },
    bloodGroup: row.blood_group,
    hospitalName: row.hospital_name
});

export const register = async (req, res, next) => {
    try {
        const { role, name, email, password, city, contact, bloodGroup, age, hospitalName, location } = req.body;
        const db = getDb();

        const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email || "").toLowerCase());
        if (existing) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const info = db
            .prepare(
                `INSERT INTO users (role, name, email, password_hash, city, contact, blood_group, age, hospital_name, lat, lng)
                 VALUES (@role, @name, @email, @password_hash, @city, @contact, @blood_group, @age, @hospital_name, @lat, @lng)`
            )
            .run({
                role,
                name,
                email: String(email || "").toLowerCase(),
                password_hash: passwordHash,
                city,
                contact: contact || null,
                blood_group: role === "donor" ? String(bloodGroup || "").toUpperCase() : null,
                age: role === "donor" ? age ?? null : null,
                hospital_name: role === "hospital" ? hospitalName || null : null,
                lat: location?.lat ?? null,
                lng: location?.lng ?? null
            });

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
        const token = signToken(user);
        res.status(201).json({ token, user: mapUserRow(user) });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const db = getDb();
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").toLowerCase());
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password || "", user.password_hash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = signToken(user);
        res.json({ token, user: mapUserRow(user) });
    } catch (error) {
        next(error);
    }
};

export const me = async (req, res, next) => {
    try {
        const db = getDb();
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.user.id));
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: mapUserRow(user) });
    } catch (error) {
        next(error);
    }
};
