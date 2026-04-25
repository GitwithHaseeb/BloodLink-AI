import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

let db;

const ensureDirForFile = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const getDb = () => {
    if (!db) {
        throw new Error("Database not initialized. Call initDb() first.");
    }
    return db;
};

export const initDb = () => {
    const filePath = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "bloodlink.sqlite");
    ensureDirForFile(filePath);

    db = new Database(filePath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK(role IN ('donor','hospital')),
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            city TEXT NOT NULL,
            contact TEXT,
            blood_group TEXT,
            age INTEGER,
            hospital_name TEXT,
            lat REAL,
            lng REAL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hospital_id INTEGER NOT NULL,
            city TEXT NOT NULL,
            needed_blood_group TEXT NOT NULL,
            units_needed INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','completed','closed')),
            urgency TEXT NOT NULL DEFAULT 'normal' CHECK(urgency IN ('normal','urgent','critical')),
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (hospital_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS request_candidates (
            request_id INTEGER NOT NULL,
            donor_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','completed','rejected')),
            accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
            acted_at TEXT,
            PRIMARY KEY (request_id, donor_id),
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
            FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_requests_city_status ON requests(city, status);
        CREATE INDEX IF NOT EXISTS idx_requests_hospital ON requests(hospital_id);
        CREATE INDEX IF NOT EXISTS idx_users_role_city ON users(role, city);
    `);

    seedDemoDirectoryIfNeeded(db);

    return db;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const FIRST_NAMES_F = [
    "Amina",
    "Sara",
    "Hira",
    "Zoya",
    "Noor",
    "Fatima",
    "Maryam",
    "Ayesha",
    "Iqra",
    "Hafsa",
    "Maha",
    "Laiba",
    "Rabia",
    "Sana",
    "Kiran"
];

const FIRST_NAMES_M = [
    "Hassan",
    "Ali",
    "Usman",
    "Bilal",
    "Hamza",
    "Omar",
    "Zain",
    "Saad",
    "Talha",
    "Rehan",
    "Shahzad",
    "Fahad",
    "Waleed",
    "Daniyal",
    "Salman"
];

const LAST_NAMES = [
    "Khan",
    "Malik",
    "Sheikh",
    "Raza",
    "Abbas",
    "Butt",
    "Cheema",
    "Qureshi",
    "Hashmi",
    "Siddiqui",
    "Javed",
    "Tariq",
    "Ansari",
    "Mirza",
    "Baig"
];

const slugify = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");

const stablePick = (items, seed) => {
    const buf = crypto.createHash("sha1").update(seed).digest();
    const idx = buf.readUInt32BE(0) % items.length;
    return items[idx];
};

const makePhone = (city, index) => {
    const suffix = crypto.createHash("sha1").update(`${city}|${index}|phone`).digest("hex");
    const digits = suffix.replace(/\D/g, "").slice(0, 9).padEnd(9, "0");
    return `03${digits}`;
};

const seedDemoDirectoryIfNeeded = (database) => {
    const flagV2 = database.prepare("SELECT value FROM meta WHERE key = ?").get("seeded_directory_v2");
    if (flagV2?.value === "1") return;

    const flagV1 = database.prepare("SELECT value FROM meta WHERE key = ?").get("seeded_directory_v1");
    if (flagV1?.value === "1") {
        database.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
            "seeded_directory_v2",
            "1"
        );
        return;
    }

    const cities = [
        "Islamabad",
        "Rawalpindi",
        "Lahore",
        "Karachi",
        "Peshawar",
        "Multan",
        "Faisalabad",
        "Sialkot",
        "Gujranwala",
        "Hyderabad",
        "Quetta",
        "Sargodha",
        "Bahawalpur",
        "Sukkur",
        "Mardan",
        "Abbottabad",
        "Muzaffarabad",
        "Gilgit",
        "Skardu",
        "Gwadar",
        "Bagh",
        "Bhimber",
        "Kotli",
        "Mirpur",
        "Neelum",
        "Poonch",
        "Sudhnati",
        "Awaran",
        "Barkhan",
        "Bolan",
        "Chagai",
        "Dera Bugti",
        "Jafarabad",
        "Jhal Magsi",
        "Kalat",
        "Kech",
        "Kharan",
        "Khuzdar",
        "Kohlu",
        "Lasbela",
        "Loralai",
        "Mastung",
        "Musakhel",
        "Naseerabad",
        "Nushki",
        "Panjgur",
        "Pishin",
        "Qilla Abdullah",
        "Qilla Saifullah",
        "Sibi",
        "Zhob",
        "Ziarat",
        "Bajaur Agency",
        "Khyber Agency",
        "Kurram Agency",
        "Mohmand Agency",
        "North Waziristan Agency",
        "Orakzai Agency",
        "South Waziristan Agency",
        "Chilas",
        "Ghizer",
        "Hunza",
        "Bannu",
        "Batagram",
        "Buner",
        "Charsadda",
        "Chitral",
        "Dera Ismail Khan",
        "Dir Lower",
        "Dir Upper",
        "Hangu",
        "Haripur",
        "Karak",
        "Kohat",
        "Kohistan",
        "Lakki Marwat",
        "Malakand",
        "Mansehra",
        "Nowshera",
        "Shangla",
        "Swabi",
        "Swat",
        "Tank",
        "Alipur",
        "Attock",
        "Bahawalnagar",
        "Bhakkar",
        "Chakwal",
        "Chiniot",
        "Dera Ghazi Khan",
        "Hafizabad",
        "Jhang",
        "Jhelum",
        "Kabirwala",
        "Kasur",
        "Khanewal",
        "Khushab",
        "Layyah",
        "Lodhran",
        "Mandi Bahauddin",
        "Mianwali",
        "Muzaffargarh",
        "Nankana Sahib",
        "Narowal",
        "Okara",
        "Pakpattan",
        "Rahim Yar Khan",
        "Rajanpur",
        "Sahiwal",
        "Sheikhupura",
        "Shekhupura",
        "Toba Tek Singh",
        "Vehari",
        "Badin",
        "Dadu",
        "Ghotki",
        "Jacobabad",
        "Jamshoro",
        "Kashmore",
        "Khairpur",
        "Larkana",
        "Matiari",
        "Mirpur Khas",
        "Naushahro Feroze",
        "Nawabshah",
        "Qambar Shahdadkot",
        "Sanghar",
        "Shikarpur",
        "Tando Allahyar",
        "Tando Muhammad Khan",
        "Tharparkar",
        "Thatta",
        "Umerkot"
    ];

    const uniqueCities = Array.from(new Set(cities.map((c) => c.trim()).filter(Boolean)));
    const passwordHash = bcrypt.hashSync("ChangeMe!123", 10);

    const insertUser = database.prepare(
        `INSERT INTO users (role, name, email, password_hash, city, contact, blood_group, age, hospital_name, lat, lng)
         VALUES (@role, @name, @email, @password_hash, @city, @contact, @blood_group, @age, @hospital_name, @lat, @lng)`
    );

    const insertMany = database.transaction(() => {
        for (const city of uniqueCities) {
            for (let i = 1; i <= 30; i += 1) {
                const isFemale = i % 2 === 0;
                const first = stablePick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M, `${city}|${i}|first`);
                const last = stablePick(LAST_NAMES, `${city}|${i}|last`);
                const blood = stablePick(BLOOD_GROUPS, `${city}|${i}|bg`);
                const age = 18 + (crypto.createHash("sha1").update(`${city}|${i}|age`).digest()[0] % 35);

                const citySlug = slugify(city);
                const firstSlug = slugify(first);
                const lastSlug = slugify(last);
                const email = `${firstSlug}.${lastSlug}.${citySlug}.${i}@gmail.com`;

                const name = `${first} ${last}`;
                const phone = makePhone(city, i);

                insertUser.run({
                    role: "donor",
                    name,
                    email,
                    password_hash: passwordHash,
                    city,
                    contact: phone,
                    blood_group: blood,
                    age,
                    hospital_name: null,
                    lat: null,
                    lng: null
                });
            }
        }

        database
            .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .run("seeded_directory_v1", "1");
        database
            .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
            .run("seeded_directory_v2", "1");
    });

    insertMany();
    console.log(`Seeded demo donors: ${uniqueCities.length} cities x 30 = ${uniqueCities.length * 30} rows`);
};
