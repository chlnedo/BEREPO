import express from "express";
import { getPRsByUserAndDate } from "../services/bitbucketService.js";
import { Parser } from "json2csv";

const router = express.Router();

/**
 * ✅ MAIN PR ENDPOINT
 * Example: /api/prs?author=<uuid>&from=2025-07-01&to=2025-07-28&repo=bitdelta_web
 */
router.get("/", async (req, res) => {
  try {
    const { author, from, to, repo, state, target_branch } = req.query;

    // ✅ Only check for required fields (remove from/to requirement)
    if (!author || !repo) {
      return res.status(400).json({ error: "Missing required query params: author, repo" });
    }

    // ✅ Fetch all PRs (getPRsByUserAndDate handles missing from/to)
    const prs = await getPRsByUserAndDate(author, from, to, repo, state, target_branch);

    // ✅ Optional filters (can be removed if handled inside service)
    let filtered = prs;
    if (state) {
      filtered = filtered.filter(pr => pr.state.toUpperCase() === state.toUpperCase());
    }
    if (target_branch) {
      filtered = filtered.filter(pr => pr.target_branch === target_branch);
    }

    res.json(filtered);
  } catch (err) {
    console.error("❌ Error fetching PRs:", err.message);
    res.status(500).json({ error: "Unable to fetch PRs" });
  }
});

/**
 * ✅ REPORT ENDPOINT (CSV Download)
 * Example: /api/prs/report?author=<uuid>&from=2025-07-01&to=2025-07-28&repo=bitdelta_web
 */
router.get("/report", async (req, res) => {
  try {
    const { author, from, to, repo, state, target_branch } = req.query;

    // ✅ Only check for author & repo
    if (!author || !repo) {
      return res.status(400).json({ error: "Missing required query params for report" });
    }

    // ✅ Fetch PRs
    const prs = await getPRsByUserAndDate(author, from, to, repo, state, target_branch);

    // ✅ Optional filters
    let filtered = prs;
    if (state) {
      filtered = filtered.filter(pr => pr.state.toUpperCase() === state.toUpperCase());
    }
    if (target_branch) {
      filtered = filtered.filter(pr => pr.target_branch === target_branch);
    }

    // ✅ Define CSV columns
    const fields = [
      { label: "PR ID", value: "id" },
      { label: "Title", value: "title" },
      { label: "State", value: "state" },
      { label: "Created On", value: "created_on" },
      { label: "Merged On", value: "merged_on" },
      { label: "Days to Merge", value: "days_to_merge" },   // ✅ now pulls directly from API
      { label: "Comments Count", value: "comments" },
      { label: "Commit Count", value: "commits" },
      { label: "Merged By", value: "merged_by" },
      { label: "Target Branch", value: "target_branch" },
      { label: "Source Branch", value: "source_branch" },
      { label: "PR Link", value: "link" }
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(filtered);

    // ✅ Make filename flexible (don’t include undefined dates)
    const datePart = from && to ? `${from}_${to}` : "ALL_TIME";

    res.header("Content-Type", "text/csv");
    res.attachment(`PR_Report_${repo}_${datePart}.csv`);
    res.send(csv);

  } catch (err) {
    console.error("❌ Error generating report:", err.message);
    res.status(500).json({ error: "Unable to generate report" });
  }
});

export default router;
