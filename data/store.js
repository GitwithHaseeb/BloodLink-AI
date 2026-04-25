import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading data:', err.message);
    }
    return null;
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error saving data:', err.message);
    }
}

function seedData() {
    const donors = [];
    for (let i = 1; i <= 50; i++) {
        donors.push({
            id: i,
            name: "Donor" + i,
            age: 20 + (i % 10),
            bloodGroup: ["A+", "B+", "O+", "AB+"][(i - 1) % 4],
            city: ["Lahore", "Karachi", "Islamabad", "Faisalabad"][(i - 1) % 4],
            contact: "0300" + (1000000 + i),
            email: "donor" + i + "@gmail.com",
            donatedTo: []
        });
    }

    const hospitals = [];
    for (let i = 1; i <= 20; i++) {
        const bloodGroupIndex = (i - 1) % 4;
        const hospitalBloodGroup = ["A+", "B+", "O+", "AB+"][bloodGroupIndex];
        hospitals.push({
            id: i,
            hospitalName: ["City Hospital", "General Hospital", "Children's Hospital", "University Hospital", "Memorial Hospital"][(i - 1) % 5] + " " + i,
            city: ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi"][(i - 1) % 5],
            bloodGroup: hospitalBloodGroup,
            contact: "042" + (1000000 + i),
            email: "hospital" + i + "@gmail.com",
            donorId: bloodGroupIndex + 1,
            receivedDonors: []
        });
    }

    return { donors, hospitals };
}

let cached = loadData();
if (!cached) {
    cached = seedData();
    saveData(cached);
}

export let donors = cached.donors;
export let hospitals = cached.hospitals;

export function persistDonors(newDonors) {
    donors = newDonors;
    saveData({ donors, hospitals });
}

export function persistHospitals(newHospitals) {
    hospitals = newHospitals;
    saveData({ donors, hospitals });
}

export function persistAll(newDonors, newHospitals) {
    if (newDonors) donors = newDonors;
    if (newHospitals) hospitals = newHospitals;
    saveData({ donors, hospitals });
}

