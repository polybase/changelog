import { Octokit } from '@octokit/rest'

const {
  GITHUB_PERSONAL_ACCESS_TOKEN,
} = process.env

export const createRelease = async (
  owner: string,
  repo: string,
  tagName: string,
  description: string,
  isPreRelease: boolean = false,
) => {
  const octokit = new Octokit({ auth: GITHUB_PERSONAL_ACCESS_TOKEN })

  // Get the latest commit on the main branch
  const branchResponse = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: 'main',
  })
  const commitSha = branchResponse.data.commit.sha

  // Create a new tag
  const tagResponse = await octokit.rest.git.createTag({
    owner,
    repo,
    tag: tagName,
    message: `Release ${tagName}`,
    object: commitSha,
    type: 'commit',
  })

  // Create a reference for the tag
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tagName}`,
    sha: tagResponse.data.sha,
  })

  // Create the release
  const releaseResponse = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    name: `Release ${tagName}`,
    body: description,
    prerelease: isPreRelease,
  })

  return releaseResponse.data.html_url
}

interface Commit {
  repo: string
  message: string
  url: string
  sha: string
}

export const findCommitsSinceLastRelease = async (
  repos: string[],
): Promise<Commit[]> => {
  const octokit = new Octokit({ auth: GITHUB_PERSONAL_ACCESS_TOKEN })
  const commits: Commit[] = []

  for (const repo of repos) {
    const [owner, repoName] = repo.split('/')

    const releasesResponse = await octokit.rest.repos.listReleases({
      owner,
      repo: repoName,
      per_page: 10, // Get up to 10 releases per page
    })

    const publishedReleases = releasesResponse.data.filter(
      (release) => !!release.published_at,
    )

    const release = publishedReleases[0]

    if (!release) return []

    // Add one second onto release time, so we exclude the release commit
    const latestReleaseDate = release.published_at
      ? new Date(release.published_at)
      : new Date()

    console.log(repo, latestReleaseDate)

    const commitsResponse = await octokit.rest.repos.listCommits({
      owner,
      repo: repoName,
      since: latestReleaseDate?.toISOString(),
    })

    for (const commitData of commitsResponse.data) {
      const commit: Commit = {
        repo,
        sha: commitData.sha,
        message: commitData.commit.message,
        url: commitData.html_url,
      }
      // if (commit.message !== release.name) {
      commits.push(commit)
      // }
    }
  }

  return commits
}