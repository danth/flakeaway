import fs from "fs";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import { Octokit } from "@octokit/rest";
import { App, createNodeMiddleware } from "@octokit/app";
import { createEvaluation } from "../jobs/evaluate.js";
import { createBuild } from "../jobs/build.js";
import { formatLog } from "../log.js";
import { loadConfig } from "../config/config.js";

// HACK: use of global variables
var app;

export class GitHub {
  static create(octokit, payload) {
    const forge = new GitHub();

    forge.octokit = octokit;

    forge.owner = payload.repository.owner.login;
    forge.repo = payload.repository.name;
    forge.repo_id = payload.repository.id;
    forge.head_branch = payload.check_suite
      ? payload.check_suite.head_branch
      : payload.check_run.check_suite.head_branch;
    forge.head_sha = payload.check_suite
      ? payload.check_suite.head_sha
      : payload.check_run.check_suite.head_sha;
    forge.installation_id = payload.installation.id;

    return forge;
  }

  serialize() {
    return {
      type: "github",
      owner: this.owner,
      repo: this.repo,
      repo_id: this.repo_id,
      head_branch: this.head_branch,
      head_sha: this.head_sha,
      installation_id: this.installation_id,
    };
  }

  static async deserialize(serialized) {
    const forge = new GitHub();

    forge.octokit = await app.getInstallationOctokit(serialized.installation_id);

    forge.owner = serialized.owner;
    forge.repo = serialized.repo;
    forge.repo_id = serialized.repo_id;
    forge.head_branch = serialized.head_branch;
    forge.head_sha = serialized.head_sha;
    forge.installation_id = serialized.installation_id;

    return forge;
  }

  pseudoFlake() {
    return `github:${this.owner}/${this.repo}/${this.head_sha}`;
  }

  async flake() {
    const { token } = await this.octokit.auth({
      type: "installation",
      repositoryIds: [this.repo_id],
      permissions: { contents: "read" },
    });
    return (
      `git+https://oauth2:${token}@github.com/` +
      encodeURIComponent(this.owner) +
      "/" +
      encodeURIComponent(this.repo) +
      ".git?ref=" +
      encodeURIComponent(this.head_branch) +
      "&rev=" +
      encodeURIComponent(this.head_sha)
    );
  }

  outputDirectory() {
    return path.join(
      "/var/lib/flakeaway/outputs/github",
      sanitizeFilename(this.owner),
      sanitizeFilename(this.repo)
    )
  }

  outputPath(fragment) {
    return path.join(
      this.outputDirectory(),
      sanitizeFilename(this.head_branch),
      sanitizeFilename(this.head_sha),
      sanitizeFilename(fragment)
    )
  }

  authorize() {
    if (process.env.GITHUB_ALLOWED_USERS) {
      const allowedUsers = process.env.GITHUB_ALLOWED_USERS.split(",");
      return allowedUsers.includes(this.owner);
    }
    return true;
  }

  async listHeads() {
    const all_branches = {};

    let page = 1;
    const per_page = 50;
    while (true) {
      const response = await this.octokit.rest.repos.listBranches({
        owner: this.owner,
        repo: this.repo,
        page,
        per_page
      });
      page += 1;

      for (const branch of response.data) {
        all_branches[branch.name] = branch.commit.sha;
      }

      if (response.data.length < per_page) {
        // Assume there are no more pages once we recieve an incomplete page.
        return all_branches;
      }
    }
  }

  async getConfig() {
    let data;
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        ref: this.head_sha,
        path: ".flakeaway.json",
      });
      data = response.data;
    } catch {
      // File not found
      return {};
    }

    if (data.type == "file") {
      const buffer = Buffer.from(data.content, data.encoding);
      const content = buffer.toString("utf-8");
      return loadConfig(content);
    }

    return {};
  }

  async createEvaluation(id) {
    const check_run = await this.octokit.rest.checks.create({
      owner: this.owner,
      repo: this.repo,
      head_sha: this.head_sha,
      external_id: id,
      name: "Evaluate",
      status: "queued",
    });
    return check_run.data.id;
  }

  async beginEvaluation(check_run_id) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "in_progress",
    });
  }

  async failEvaluation(check_run_id) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "completed",
      conclusion: "failure",
      output: {
        title: "Evaluation failed",
        summary: "There was an error when trying to evaluate the outputs of the flake.",
      },
    });
  }

  async finishEvaluation(check_run_id, status) {
    let conclusion = status.failed.length ? "failure" : "success";
    let summary = "";

    if (status.failed.length) {
      summary += "### Failed to evaluate:\n";
      for (const item of status.failed) {
        summary += `- ${item.attr}\n`;
        summary += "  ```\n  ";
        summary += item.error.replace("\n", "\n  ");
        summary += "\n  ```\n";
      }
    }

    if (status.systemErrors) {
      summary += "### Evaluation unavailable:\n";
      summary += `${status.systemErrors} jobs could not be evaluated because `;
      summary += "their evaluation requires a platform which is not supported.\n";
    }

    if (status.succeeded.length) {
      summary += "### Evaluated successfully:\n";
      for (const item of status.succeeded) {
        summary += `- ${item.attr}\n`;
      }
    }

    if (!status.failed.length && !status.succeeded.length) {
      if (status.systemErrors) {
        conclusion = "skipped";
      } else {
        conclusion = "neutral";
        summary += "This flake does not contain any buildable outputs.";
      }
    }

    const title = status.failed.length ? "Evaluation partially failed" : "Evaluation finished";

    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "completed",
      conclusion,
      output: { title, summary },
    });
  }

  async createBuild(id, fragment) {
    const check_run = await this.octokit.rest.checks.create({
      owner: this.owner,
      repo: this.repo,
      head_sha: this.head_sha,
      external_id: id,
      name: `Build ${fragment}`,
      status: "queued",
    });
    return check_run.data.id;
  }

  async createSkippedBuild(id, fragment) {
    const check_run = await this.octokit.rest.checks.create({
      owner: this.owner,
      repo: this.repo,
      head_sha: this.head_sha,
      external_id: id,
      name: `Build ${fragment}`,
      status: "completed",
      conclusion: "skipped",
      output: {
        title: "Build unavailable",
        summary: "This fragment cannot be built as it requires a platform which is not supported.",
      },
    });
    return check_run.data.id;
  }

  async beginBuild(check_run_id) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "in_progress",
    });
  }

  async failBuild(check_run_id, log) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "completed",
      conclusion: "failure",
      output: {
        title: "Build failed",
        summary: "There was an error during the build or substitution of this fragment.",
        text: formatLog(log),
      },
    });
  }

  async skipBuild(check_run_id, log) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "completed",
      conclusion: "skipped",
      output: {
        title: "Build unavailable",
        summary: "This fragment cannot be built as it requires a platform which is not supported.",
        text: formatLog(log),
      },
    });
  }

  async finishBuild(check_run_id, log) {
    await this.octokit.rest.checks.update({
      owner: this.owner,
      repo: this.repo,
      check_run_id,
      status: "completed",
      conclusion: "success",
      output: {
        title: "Build succeeded",
        summary: "This fragment was built or substituted successfully.",
        text: formatLog(log),
      },
    });
  }
}

export function initializeGitHub({ expressApp, evaluationQueue, buildQueue }) {
  app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: fs.readFileSync(process.env.GITHUB_PRIVATE_KEY_FILE),
    oauth: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    webhooks: {
      secret: process.env.GITHUB_WEBHOOK_SECRET,
    },
    Octokit,
  });

  expressApp.use(
    createNodeMiddleware(app, {
      pathPrefix: "/api/github",
    })
  );

  app.octokit
    .request("/app")
    .then(({ data }) => console.log("authenticated to GitHub as %s", data.name));

  app.webhooks.on("check_suite.requested", async ({ octokit, payload }) => {
    await createEvaluation({
      forge: GitHub.create(octokit, payload),
      queue: evaluationQueue,
    });
  });

  app.webhooks.on("check_suite.rerequested", async ({ octokit, payload }) => {
    await createEvaluation({
      forge: GitHub.create(octokit, payload),
      queue: evaluationQueue,
    });
  });

  app.webhooks.on("check_run.rerequested", async ({ octokit, payload }) => {
    if (payload.check_run.name.startsWith("Build")) {
      await createBuild({
        forge: GitHub.create(octokit, payload),
        queue: buildQueue,
        /* .slice(6) removes 'Build ' from the start of the name,
         * leaving the fragment to be rebuilt.
         * TODO: Determine the rerequested fragment more reliably.
         */
        fragment: payload.check_run.name.slice(6),
      });
    } else {
      await createEvaluation({
        forge: GitHub.create(octokit, payload),
        queue: evaluationQueue,
      });
    }
  });
}
