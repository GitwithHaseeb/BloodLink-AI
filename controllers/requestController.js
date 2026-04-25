import { getDb } from "../db/sqlite.js";
import { canDonateTo } from "../utils/blood.js";

const distanceKm = (a, b) => {
    if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return Number((R * c).toFixed(1));
};

const mapHospital = (row) => ({
    _id: String(row.id),
    hospitalName: row.hospital_name || row.name,
    name: row.name,
    city: row.city,
    contact: row.contact,
    email: row.email,
    location:
        row.lat == null || row.lng == null
            ? undefined
            : {
                  lat: row.lat,
                  lng: row.lng
              }
});

const mapDonor = (row) => ({
    _id: String(row.id),
    name: row.name,
    bloodGroup: row.blood_group,
    city: row.city,
    contact: row.contact,
    email: row.email
});

const fetchRequestWithRelations = (db, requestId) => {
    const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(requestId);
    if (!request) return null;

    const hospitalRow = db
        .prepare(
            `SELECT u.* FROM users u WHERE u.id = ?`
        )
        .get(request.hospital_id);

    const candidates = db
        .prepare(
            `SELECT rc.*, u.name, u.email, u.contact, u.city, u.blood_group
             FROM request_candidates rc
             JOIN users u ON u.id = rc.donor_id
             WHERE rc.request_id = ?
             ORDER BY rc.accepted_at DESC`
        )
        .all(requestId)
        .map((row) => ({
            donor: {
                _id: String(row.donor_id),
                name: row.name,
                email: row.email,
                contact: row.contact,
                city: row.city,
                bloodGroup: row.blood_group
            },
            status: row.status,
            acceptedAt: row.accepted_at,
            actedAt: row.acted_at
        }));

    return {
        _id: String(request.id),
        id: request.id,
        hospital: mapHospital(hospitalRow),
        city: request.city,
        neededBloodGroup: request.needed_blood_group,
        unitsNeeded: request.units_needed,
        status: request.status,
        urgency: request.urgency,
        note: request.note,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        candidates
    };
};

export const createHospitalRequest = async (req, res, next) => {
    try {
        const db = getDb();
        const hospital = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.user.id));
        const { neededBloodGroup, unitsNeeded, urgency, note } = req.body;
        if (!neededBloodGroup) {
            return res.status(400).json({ message: "neededBloodGroup is required" });
        }

        const info = db
            .prepare(
                `INSERT INTO requests (hospital_id, city, needed_blood_group, units_needed, status, urgency, note)
                 VALUES (@hospital_id, @city, @needed_blood_group, @units_needed, 'open', @urgency, @note)`
            )
            .run({
                hospital_id: hospital.id,
                city: hospital.city,
                needed_blood_group: String(neededBloodGroup).toUpperCase(),
                units_needed: Number(unitsNeeded || 1),
                urgency: urgency || "normal",
                note: note || ""
            });

        const request = fetchRequestWithRelations(db, info.lastInsertRowid);
        res.status(201).json({ request });
    } catch (error) {
        next(error);
    }
};

export const getHospitalRequests = async (req, res, next) => {
    try {
        const db = getDb();
        const rows = db
            .prepare(`SELECT id FROM requests WHERE hospital_id = ? ORDER BY datetime(created_at) DESC`)
            .all(Number(req.user.id));

        const requests = rows.map((row) => fetchRequestWithRelations(db, row.id));
        res.json({ requests });
    } catch (error) {
        next(error);
    }
};

export const getDonorNearbyRequests = async (req, res, next) => {
    try {
        const db = getDb();
        const donor = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.user.id));
        const rows = db
            .prepare(
                `SELECT r.*, u.name AS hospital_account_name, u.hospital_name, u.contact, u.email, u.lat, u.lng
                 FROM requests r
                 JOIN users u ON u.id = r.hospital_id
                 WHERE lower(r.city) = lower(?) AND r.status IN ('open','in_progress')
                 ORDER BY datetime(r.created_at) DESC`
            )
            .all(donor.city);

        const donorLocation =
            donor.lat == null || donor.lng == null
                ? undefined
                : {
                      lat: donor.lat,
                      lng: donor.lng
                  };

        const matched = rows
            .filter((row) => canDonateTo(donor.blood_group, row.needed_blood_group))
            .map((row) => {
                const hospitalLocation =
                    row.lat == null || row.lng == null
                        ? undefined
                        : {
                              lat: row.lat,
                              lng: row.lng
                          };

                return {
                    _id: String(row.id),
                    id: row.id,
                    hospital: {
                        _id: String(row.hospital_id),
                        hospitalName: row.hospital_name || row.hospital_account_name,
                        name: row.hospital_account_name,
                        city: row.city,
                        contact: row.contact,
                        email: row.email,
                        location: hospitalLocation
                    },
                    city: row.city,
                    neededBloodGroup: row.needed_blood_group,
                    unitsNeeded: row.units_needed,
                    status: row.status,
                    urgency: row.urgency,
                    note: row.note,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    distanceKm: distanceKm(donorLocation, hospitalLocation)
                };
            });

        res.json({ requests: matched });
    } catch (error) {
        next(error);
    }
};

export const acceptDonationRequest = async (req, res, next) => {
    try {
        const db = getDb();
        const donor = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(req.user.id));
        const requestRow = db.prepare("SELECT * FROM requests WHERE id = ?").get(Number(req.params.id));
        if (!requestRow) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (!canDonateTo(donor.blood_group, requestRow.needed_blood_group)) {
            return res.status(400).json({ message: "Your blood group is not compatible for this request" });
        }
        if (String(requestRow.city).toLowerCase() !== String(donor.city).toLowerCase()) {
            return res.status(400).json({ message: "This request belongs to a different city" });
        }

        const existing = db
            .prepare("SELECT 1 FROM request_candidates WHERE request_id = ? AND donor_id = ?")
            .get(requestRow.id, donor.id);
        if (!existing) {
            db.prepare(
                `INSERT INTO request_candidates (request_id, donor_id, status) VALUES (?, ?, 'pending')`
            ).run(requestRow.id, donor.id);
            db.prepare(`UPDATE requests SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`).run(
                requestRow.id
            );
        }

        const request = fetchRequestWithRelations(db, requestRow.id);
        res.json({ message: "Request accepted and sent to hospital for approval", request });
    } catch (error) {
        next(error);
    }
};

export const donorMyHistory = async (req, res, next) => {
    try {
        const db = getDb();
        const rows = db
            .prepare(
                `SELECT r.id, r.city, r.needed_blood_group, rc.status, rc.accepted_at, rc.acted_at,
                        u.hospital_name, u.name AS hospital_account_name, u.contact
                 FROM request_candidates rc
                 JOIN requests r ON r.id = rc.request_id
                 JOIN users u ON u.id = r.hospital_id
                 WHERE rc.donor_id = ?
                 ORDER BY datetime(rc.accepted_at) DESC`
            )
            .all(Number(req.user.id));

        const history = rows.map((row) => ({
            id: row.id,
            hospital: {
                hospitalName: row.hospital_name || row.hospital_account_name,
                city: row.city,
                contact: row.contact
            },
            neededBloodGroup: row.needed_blood_group,
            city: row.city,
            status: row.status,
            acceptedAt: row.accepted_at,
            actedAt: row.acted_at
        }));

        res.json({ history });
    } catch (error) {
        next(error);
    }
};

export const approveCandidate = async (req, res, next) => {
    try {
        const { donorId, decision } = req.body;
        const db = getDb();
        const requestRow = db
            .prepare("SELECT * FROM requests WHERE id = ? AND hospital_id = ?")
            .get(Number(req.params.id), Number(req.user.id));
        if (!requestRow) {
            return res.status(404).json({ message: "Request not found" });
        }

        const candidate = db
            .prepare("SELECT * FROM request_candidates WHERE request_id = ? AND donor_id = ?")
            .get(requestRow.id, Number(donorId));
        if (!candidate) {
            return res.status(404).json({ message: "Donor candidate not found for this request" });
        }

        const status = decision === "approve" ? "approved" : "rejected";
        db.prepare(
            `UPDATE request_candidates
             SET status = ?, acted_at = datetime('now')
             WHERE request_id = ? AND donor_id = ?`
        ).run(status, requestRow.id, Number(donorId));

        const request = fetchRequestWithRelations(db, requestRow.id);
        res.json({ message: `Candidate ${status}`, request });
    } catch (error) {
        next(error);
    }
};

export const completeDonation = async (req, res, next) => {
    try {
        const { donorId } = req.body;
        const db = getDb();
        const requestRow = db
            .prepare("SELECT * FROM requests WHERE id = ? AND hospital_id = ?")
            .get(Number(req.params.id), Number(req.user.id));
        if (!requestRow) {
            return res.status(404).json({ message: "Request not found" });
        }
        const candidate = db
            .prepare("SELECT * FROM request_candidates WHERE request_id = ? AND donor_id = ?")
            .get(requestRow.id, Number(donorId));
        if (!candidate) {
            return res.status(404).json({ message: "Donor candidate not found for this request" });
        }

        db.prepare(
            `UPDATE request_candidates
             SET status = 'completed', acted_at = datetime('now')
             WHERE request_id = ? AND donor_id = ?`
        ).run(requestRow.id, Number(donorId));

        db.prepare(`UPDATE requests SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(
            requestRow.id
        );

        const request = fetchRequestWithRelations(db, requestRow.id);
        res.json({ message: "Donation marked as done for hospital and donor", request });
    } catch (error) {
        next(error);
    }
};

export const hospitalDonorHistory = async (req, res, next) => {
    try {
        const db = getDb();
        const rows = db
            .prepare(
                `SELECT r.id AS request_id, r.needed_blood_group, rc.acted_at,
                        u.id AS donor_id, u.name, u.blood_group, u.city, u.contact, u.email
                 FROM request_candidates rc
                 JOIN requests r ON r.id = rc.request_id
                 JOIN users u ON u.id = rc.donor_id
                 WHERE r.hospital_id = ? AND rc.status = 'completed'
                 ORDER BY datetime(rc.acted_at) DESC`
            )
            .all(Number(req.user.id));

        const donors = rows.map((row) => ({
            requestId: String(row.request_id),
            requestBloodGroup: row.needed_blood_group,
            donor: {
                _id: String(row.donor_id),
                name: row.name,
                bloodGroup: row.blood_group,
                city: row.city,
                contact: row.contact,
                email: row.email
            },
            completedAt: row.acted_at
        }));

        res.json({ donors });
    } catch (error) {
        next(error);
    }
};
