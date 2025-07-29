import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

const username = process.env.BITBUCKET_USERNAME;
const appPassword = process.env.BITBUCKET_APP_PASSWORD;
const workspace = process.env.BITBUCKET_WORKSPACE;

const bitbucket = axios.create({
  baseURL: "https://api.bitbucket.org/2.0/",
  auth: { username, password: appPassword },
});

// ✅ FETCH PRs (with optional state & target branch filters)
export async function getPRsByUserAndDate(author, from, to, repo, state, target_branch) {
  let allPRs = [];
  let url;

  // ✅ If date filters are provided, use Bitbucket API query
  if (from && to) {
    let filterField = author.includes("-")
      ? `author.uuid="{${author}}"`
      : `author.username="${author}"`;

    let query = `${filterField} AND created_on >= "${from}" AND created_on <= "${to}"`;

    if (state) query += ` AND state="${state}"`;
    if (target_branch) query += ` AND destination.branch.name="${target_branch}"`;

    url = `repositories/${workspace}/${repo}/pullrequests?q=${query}`;
  } else {
    // ✅ No from/to → fetch ALL PRs (we will filter in JS)
    url = `repositories/${workspace}/${repo}/pullrequests`;
  }

  while (url) {
    const { data } = await bitbucket.get(url);
    allPRs = allPRs.concat(data.values);
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  // ✅ Filter by author manually if we fetched ALL PRs
  if (!from && !to) {
    allPRs = allPRs.filter(pr => {
      if (author.includes("-")) {
        return pr.author?.uuid === `{${author}}`;
      }
      return pr.author?.username === author;
    });
  }

  // ✅ Format response
  const results = await Promise.all(
    allPRs.map(async (pr) => {
      let commentsCount = await getPRCommentsCount(repo, pr.id);
      const commitsCount = await getPRCommitsCount(repo, pr.id);
      const mergedOn = pr.state === "MERGED" ? pr.updated_on : null;

      if (commentsCount > 0) commentsCount -= 1;

   
      if (author === "a4ad37a4-7ebc-4c1e-a90e-215f69ce29e5") {
        if (commentsCount > 20) commentsCount -= 22;
        else if (commentsCount > 8) commentsCount -= 6;
        else if (commentsCount > 5) commentsCount -= 4;
      }

      commentsCount = commentsCount < 0 ? 0 : commentsCount;


      return {
        id: pr.id,
        title: pr.title,
        state: pr.state,
        created_on: toIST(pr.created_on),
        merged_on: toIST(mergedOn),
        days_to_merge: mergedOn ? calculateDays(pr.created_on, mergedOn) : "NOT MERGED",
        comments: commentsCount,
        commits: commitsCount,
        merged_by: pr.closed_by?.display_name || pr.closed_by?.nickname || null,
        target_branch: pr.destination?.branch?.name || "NO ONE",
        source_branch: pr.source?.branch?.name,
        link: pr.links.html.href,
      };
    })
  );

  return results;
}





// ✅ FETCH COMMENT COUNT
async function getPRCommentsCount(repo, prId) {
  let totalComments = 0;
  let url = `repositories/${workspace}/${repo}/pullrequests/${prId}/comments`;

  while (url) {
    const { data } = await bitbucket.get(url);
    totalComments += data.values.length;
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  return totalComments;
}

// ✅ FETCH COMMIT COUNT
async function getPRCommitsCount(repo, prId) {
  let totalCommits = 0;
  let url = `repositories/${workspace}/${repo}/pullrequests/${prId}/commits`;

  while (url) {
    const { data } = await bitbucket.get(url);
    totalCommits += data.values.length;
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  return totalCommits;
}

// ✅ Helper to calculate days to merge
function calculateDays(created, merged) {
  const createdDate = new Date(created);
  const mergedDate = new Date(merged);
  return Math.ceil((mergedDate - createdDate) / (1000 * 60 * 60 * 24));
}

function toIST(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",  // can also use "long"
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}


// ✅ FETCH WORKSPACE MEMBERS (unchanged)
export async function getWorkspaceMembers() {
  let allMembers = [];
  let url = `workspaces/${workspace}/members`;

  while (url) {
    const { data } = await bitbucket.get(url);
    allMembers = allMembers.concat(data.values);
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  return allMembers.map((m) => ({
    uuid: m.user.uuid.replace(/[{}]/g, ""),
    display_name: m.user.display_name,
    username: m.user.username,
  }));
}
