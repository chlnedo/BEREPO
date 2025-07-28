import express from "express";
import { getWorkspaceMembers } from "../services/bitbucketService.js";

const router = express.Router();

/**
 * GET /api/members
 * Fetch all members from Bitbucket workspace with UUID, display_name, and username
 */
router.get("/", async (req, res) => {
  try {
    const members = await getWorkspaceMembers();
    res.json(members);
  } catch (err) {
    console.error("❌ Error fetching members:", err.message);
    res.status(500).json({ error: "Unable to fetch workspace members" });
  }
});

export default router;
