import express from "express";
import { getPRsByUserAndDate } from "../services/bitbucketService.js";

const router = express.Router();

/**
 * GET /api/prs?author=<username_or_uuid>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>&repo=<repo>
 */
router.get("/", async (req, res) => {
  try {
    const { author, from, to, repo } = req.query;

    if (!author || !from || !to || !repo) {
      return res.status(400).json({ error: "Missing required query params: author, from, to, repo" });
    }

    const prs = await getPRsByUserAndDate(author, from, to, repo);
    res.json(prs);
  } catch (err) {
    console.error("❌ Error fetching PRs:", err.message);
    res.status(500).json({ error: "Unable to fetch PRs" });
  }
});

export default router;
