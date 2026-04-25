import express from "express";
import { searchDonors, searchHospitals } from "../controllers/directoryController.js";

const router = express.Router();

router.get("/donors", searchDonors);
router.get("/hospitals", searchHospitals);

export default router;
