import { getDb } from "../db/sqlite.js";

export const searchDonors = (req, res, next) => {
    try {
        const city = String(req.query.city || "").trim();
        const bloodGroup = String(req.query.bloodGroup || "").trim().toUpperCase();

        if (!city) return res.status(400).json({ message: "city is required" });
        if (!bloodGroup) return res.status(400).json({ message: "bloodGroup is required" });

        const db = getDb();
        const donors = db
            .prepare(
                `SELECT id, name, email, contact, city, blood_group AS bloodGroup, age
                 FROM users
                 WHERE role = 'donor' AND lower(city) = lower(?) AND upper(blood_group) = ?
                 ORDER BY name ASC
                 LIMIT 200`
            )
            .all(city, bloodGroup);

        res.json(donors);
    } catch (error) {
        next(error);
    }
};

export const searchHospitals = (req, res, next) => {
    try {
        const city = String(req.query.city || "").trim();
        const bloodGroup = String(req.query.bloodGroup || "").trim().toUpperCase();

        if (!city) return res.status(400).json({ message: "city is required" });
        if (!bloodGroup) return res.status(400).json({ message: "bloodGroup is required" });

        const db = getDb();
        const hospitals = db
            .prepare(
                `SELECT id,
                        coalesce(hospital_name, name) AS hospitalName,
                        email,
                        contact,
                        city,
                        blood_group AS bloodGroup
                 FROM users
                 WHERE role = 'hospital' AND lower(city) = lower(?) AND upper(blood_group) = ?
                 ORDER BY hospitalName ASC
                 LIMIT 200`
            )
            .all(city, bloodGroup);

        res.json(hospitals);
    } catch (error) {
        next(error);
    }
};
