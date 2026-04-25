import { donors, hospitals, persistHospitals, persistAll } from '../data/store.js';

export const getHospitalsArray = () => hospitals;

export const addDonorToHospital = (donorId, hospitalId) => {
    const hospital = hospitals.find(h => h.id == hospitalId);
    if (hospital && !hospital.receivedDonors.includes(donorId)) {
        hospital.receivedDonors.push(donorId);
        persistAll(donors, hospitals);
    }
};

export const addHospital = (req, res) => {
    const newHospital = {
        id: hospitals.length > 0 ? Math.max(...hospitals.map(h => h.id)) + 1 : 1,
        ...req.body,
        bloodGroup: req.body.bloodGroup || req.body.bloodGroupNeeded || "Not Specified",
        receivedDonors: []
    };
    hospitals.push(newHospital);
    persistHospitals(hospitals);
    res.status(201).json(newHospital);
};

export const getHospitals = (req, res) => {
    const result = hospitals.map(h => {
        const donor = donors.find(d => d.id == h.donorId);
        const donorsList = h.receivedDonors.map(donorId => {
            return donors.find(d => d.id == donorId);
        }).filter(d => d);

        return {
            ...h,
            donorInfo: donor,
            donorsReceived: donorsList,
            totalDonorsReceived: donorsList.length
        };
    });
    res.json(result);
};

export const getHospitalById = (req, res) => {
    const h = hospitals.find(h => h.id == req.params.id);
    if (!h) return res.status(404).json({ message: "Hospital not found" });
    const donor = donors.find(d => d.id == h.donorId);
    const donorsList = h.receivedDonors.map(donorId => {
        return donors.find(d => d.id == donorId);
    }).filter(d => d);
    res.json({
        ...h,
        donorInfo: donor,
        donorsReceived: donorsList,
        totalDonorsReceived: donorsList.length
    });
};

export const updateHospital = (req, res) => {
    const index = hospitals.findIndex(h => h.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: "Hospital not found" });
    }
    hospitals[index] = { ...hospitals[index], ...req.body };
    persistHospitals(hospitals);
    res.json(hospitals[index]);
};

export const deleteHospital = (req, res) => {
    const index = hospitals.findIndex(h => h.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ message: "Hospital not found" });
    }
    hospitals.splice(index, 1);
    persistHospitals(hospitals);
    res.json({ message: "Deleted" });
};

export const searchHospitals = (req, res) => {
    const { hospitalName, city, bloodGroup, donorId } = req.query;
    let result = [...hospitals];

    if (hospitalName) {
        const q = String(hospitalName).toLowerCase();
        result = result.filter(h => h.hospitalName && h.hospitalName.toLowerCase().includes(q));
    }
    if (city) {
        result = result.filter(h => h.city.toLowerCase() === String(city).toLowerCase());
    }
    if (bloodGroup) {
        const search = String(bloodGroup).toUpperCase().trim();
        result = result.filter(hospital => {
            const hospitalBG = hospital.bloodGroup ? hospital.bloodGroup.toUpperCase() : "";
            if (!hospitalBG) return false;
            if (hospitalBG === search) return true;
            if (search === "A" || search === "B" || search === "O") {
                return hospitalBG.startsWith(search) && !hospitalBG.startsWith("AB");
            }
            if (search === "AB") return hospitalBG.startsWith("AB");
            return false;
        });
    }
    if (donorId) {
        result = result.filter(h => h.donorId == donorId);
    }

    const enrichedResult = result.map(h => {
        const donor = donors.find(d => d.id == h.donorId);
        const donorsList = h.receivedDonors.map(donorId => {
            return donors.find(d => d.id == donorId);
        }).filter(d => d);
        return {
            ...h,
            donorInfo: donor,
            donorsReceived: donorsList,
            totalDonorsReceived: donorsList.length
        };
    });
    res.json(enrichedResult);
};

export const getHospitalDonors = (req, res) => {
    const hospital = hospitals.find(h => h.id == req.params.id);
    if (!hospital) {
        return res.status(404).json({ message: "Hospital not found" });
    }

    const donorsList = hospital.receivedDonors.map(donorId => {
        return donors.find(d => d.id == donorId);
    }).filter(d => d);

    res.json({
        hospital: {
            id: hospital.id,
            name: hospital.hospitalName,
            city: hospital.city,
            bloodGroup: hospital.bloodGroup
        },
        donors: donorsList,
        totalDonors: donorsList.length
    });
};

