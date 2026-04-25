import { donors, hospitals, persistAll } from '../data/store.js';

// Proper blood group compatibility
// Donor can donate to recipient if recipient's antigens are subset of donor's
// O- is universal donor. AB+ is universal recipient.
function canDonate(donorBG, recipientBG) {
    const bg = donorBG.toUpperCase().trim();
    const need = recipientBG.toUpperCase().trim();
    if (bg === need) return true;

    const compat = {
        'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+':  ['O+', 'A+', 'B+', 'AB+'],
        'A-':  ['A-', 'A+', 'AB-', 'AB+'],
        'A+':  ['A+', 'AB+'],
        'B-':  ['B-', 'B+', 'AB-', 'AB+'],
        'B+':  ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+']
    };

    return compat[bg]?.includes(need) || false;
}

export const getDonors = (req, res) => res.json(donors);

export const getDonorById = (req, res) => {
    const donor = donors.find(d => d.id == req.params.id);
    if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
    }
    res.json(donor);
};

export const addDonor = (req, res) => {
    const newDonor = {
        id: donors.length > 0 ? Math.max(...donors.map(d => d.id)) + 1 : 1,
        ...req.body,
        donatedTo: []
    };
    donors.push(newDonor);
    persistAll(donors, hospitals);
    res.status(201).json(newDonor);
};

export const updateDonor = (req, res) => {
    const index = donors.findIndex(d => d.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: "Donor not found" });
    }
    donors[index] = { ...donors[index], ...req.body };
    persistAll(donors, hospitals);
    res.json(donors[index]);
};

export const deleteDonor = (req, res) => {
    const index = donors.findIndex(d => d.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: "Donor not found" });
    }
    donors.splice(index, 1);
    persistAll(donors, hospitals);
    res.json({ message: "Deleted" });
};

export const searchDonors = (req, res) => {
    const { name, city, bloodGroup, age } = req.query;
    let result = [...donors];
    if (name) {
        const q = String(name).toLowerCase();
        result = result.filter(d => d.name.toLowerCase().includes(q));
    }
    if (city) {
        result = result.filter(d => d.city.toLowerCase() === String(city).toLowerCase());
    }
    if (bloodGroup) {
        const search = String(bloodGroup).toUpperCase().trim();
        result = result.filter(donor => {
            const donorBG = donor.bloodGroup.toUpperCase();
            if (donorBG === search) return true;
            if (search === 'A' || search === 'B' || search === 'O') {
                return donorBG.startsWith(search) && !donorBG.startsWith('AB');
            }
            if (search === 'AB') return donorBG.startsWith('AB');
            return false;
        });
    }
    if (age) result = result.filter(d => d.age == age);
    res.json(result);
};

export const donateToHospital = (req, res) => {
    const { donorId, hospitalId } = req.body;

    const donor = donors.find(d => d.id == donorId);
    if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
    }

    const hospital = hospitals.find(h => h.id == hospitalId);
    if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
    }

    const isMatch = canDonate(donor.bloodGroup, hospital.bloodGroup);

    if (!isMatch) {
        return res.status(400).json({
            message: `Blood group mismatch! Donor ${donor.name} has ${donor.bloodGroup} but hospital needs ${hospital.bloodGroup}`,
            donorBloodGroup: donor.bloodGroup,
            hospitalBloodGroup: hospital.bloodGroup
        });
    }

    if (!donor.donatedTo.includes(hospitalId)) {
        donor.donatedTo.push(hospitalId);
    }

    if (!hospital.receivedDonors.includes(donorId)) {
        hospital.receivedDonors.push(donorId);
    }

    persistAll(donors, hospitals);

    res.json({
        message: `Donor ${donor.name} (${donor.bloodGroup}) donated to ${hospital.hospitalName} (needs ${hospital.bloodGroup})`,
        match: true,
        donation: {
            donorId: donor.id,
            donorName: donor.name,
            donorBloodGroup: donor.bloodGroup,
            hospitalId: hospital.id,
            hospitalName: hospital.hospitalName,
            hospitalBloodGroup: hospital.bloodGroup
        }
    });
};

export const getDonorDonations = (req, res) => {
    const donor = donors.find(d => d.id == req.params.id);
    if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
    }

    const donatedHospitals = donor.donatedTo.map(hospitalId => {
        return hospitals.find(h => h.id == hospitalId);
    }).filter(h => h);

    res.json({
        donor: {
            id: donor.id,
            name: donor.name,
            bloodGroup: donor.bloodGroup,
            city: donor.city
        },
        totalDonations: donor.donatedTo.length,
        donatedTo: donatedHospitals.map(h => ({
            id: h.id,
            name: h.hospitalName,
            city: h.city,
            bloodGroupNeeded: h.bloodGroup
        }))
    });
};

