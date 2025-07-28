import dotenv from 'dotenv';
dotenv.config();
import axios from "axios";

const username = process.env.BITBUCKET_USERNAME;
const appPassword = process.env.BITBUCKET_APP_PASSWORD;
const workspace = process.env.BITBUCKET_WORKSPACE;

const bitbucket = axios.create({
  baseURL: "https://api.bitbucket.org/2.0/",
  auth: { username, password: appPassword },
});

// ✅ FETCH PRs (modified to use uuid if passed)
export async function getPRsByUserAndDate(author, from, to, repo) {
  let filterField = author.includes("-") ? `author.uuid="{${author}}"` : `author.username="${author}"`;

  let allPRs = [];
  let url = `repositories/${workspace}/${repo}/pullrequests?q=${filterField} AND created_on >= "${from}" AND created_on <= "${to}"`;

  while (url) {
    const { data } = await bitbucket.get(url);
    allPRs = allPRs.concat(data.values);
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  const results = await Promise.all(
    allPRs.map(async (pr) => {
      const commentsCount = await getPRCommentsCount(repo, pr.id);
      return {
        id: pr.id,
        title: pr.title,
        state: pr.state,
        created_on: pr.created_on,
        comments: commentsCount,
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

// ✅ FETCH WORKSPACE MEMBERS
export async function getWorkspaceMembers() {
  let allMembers = [];
  let url = `workspaces/${workspace}/members`;

  while (url) {
    const { data } = await bitbucket.get(url);
    allMembers = allMembers.concat(data.values);
    url = data.next ? data.next.replace("https://api.bitbucket.org/2.0/", "") : null;
  }

  // Clean up the response
  return allMembers.map((m) => ({
    uuid: m.user.uuid.replace(/[{}]/g, ""),
    display_name: m.user.display_name,
    username: m.user.username,
  }));
}
