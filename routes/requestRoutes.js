import express from "express";
import {
    acceptDonationRequest,
    approveCandidate,
    completeDonation,
    createHospitalRequest,
    donorMyHistory,
    getDonorNearbyRequests,
    getHospitalRequests,
    hospitalDonorHistory
} from "../controllers/requestController.js";
import { requireAuth, requireRole, rateLimiter } from "../middleware/auth.js";

const router = express.Router();

router.get("/donor/nearby", requireAuth, requireRole("donor"), getDonorNearbyRequests);
router.post("/donor/accept/:id", rateLimiter, requireAuth, requireRole("donor"), acceptDonationRequest);
router.get("/donor/history", requireAuth, requireRole("donor"), donorMyHistory);

router.post("/hospital/create", rateLimiter, requireAuth, requireRole("hospital"), createHospitalRequest);
router.get("/hospital/list", requireAuth, requireRole("hospital"), getHospitalRequests);
router.post("/hospital/approve/:id", rateLimiter, requireAuth, requireRole("hospital"), approveCandidate);
router.post("/hospital/complete/:id", rateLimiter, requireAuth, requireRole("hospital"), completeDonation);
router.get("/hospital/history", requireAuth, requireRole("hospital"), hospitalDonorHistory);

export default router;
