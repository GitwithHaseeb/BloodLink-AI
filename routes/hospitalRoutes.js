import express from "express";

import {
    addHospital,
    getHospitals,
    getHospitalById,
    updateHospital,
    deleteHospital,
    searchHospitals,
    getHospitalDonors
} from "../controllers/hospitalController.js";

import { rateLimiter, validateHospital } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getHospitals);
router.get("/search", searchHospitals);
router.get("/:id", getHospitalById);
router.get("/:id/donors", getHospitalDonors);
router.post("/", rateLimiter, validateHospital, addHospital);
router.put("/:id", rateLimiter, validateHospital, updateHospital);
router.delete("/:id", rateLimiter, deleteHospital);

export default router;

