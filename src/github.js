async function githubFlakeUrl({ octokit, target }) {
  const { token } = await octokit.auth({
    type: 'installation',
    repositoryIds: [target.repo_id],
    permissions: { contents: 'read' },
  })
	const { owner, repo, head_branch, head_sha } = target
	return `git+https://oauth2:${token}@github.com/${owner}/${repo}.git?ref=${head_branch}&rev=${head_sha}`
}

function reducePayload(payload) {
  return {
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    repo_id: payload.repository.id,
    head_branch: payload.check_suite
               ? payload.check_suite.head_branch
               : payload.check_run.check_suite.head_branch,
    head_sha: payload.check_suite
            ? payload.check_suite.head_sha
            : payload.check_run.check_suite.head_sha,
    installation_id: payload.installation.id,
  }
}

module.exports = { githubFlakeUrl, reducePayload }
