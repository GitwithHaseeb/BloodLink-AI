import express from "express";

import {
    getDonors,
    getDonorById,
    addDonor,
    updateDonor,
    deleteDonor,
    searchDonors,
    donateToHospital,
    getDonorDonations
} from "../controllers/donorController.js";

import { rateLimiter, validateDonor } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getDonors);
router.get("/search", searchDonors);
router.get("/:id", getDonorById);
router.get("/:id/donations", getDonorDonations);
router.post("/", rateLimiter, validateDonor, addDonor);
router.post("/donate", rateLimiter, donateToHospital);
router.put("/:id", rateLimiter, validateDonor, updateDonor);
router.delete("/:id", rateLimiter, deleteDonor);

export default router;

