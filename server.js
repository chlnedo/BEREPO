import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import prsRoute from "./routes/prs.js";
import membersRoute from "./routes/members.js";   // ✅ NEW

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: "http://localhost:3000",   // allow Next.js dev server
  methods: "GET,POST",
  credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => res.send("✅ Bitbucket Analytics Backend Running"));

app.use("/api/prs", prsRoute);
app.use("/api/members", membersRoute);   // ✅ NEW

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
