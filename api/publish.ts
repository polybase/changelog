import type { VercelRequest, VercelResponse } from '@vercel/node'
import { wrapper } from './_wrapper'
import { polybase } from './_polybase'
import { createBranch, findReposWithCommitsSinceLastRelease } from './_github'
import { REPOS } from './_repos'

export default wrapper(async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  // Body parameters
  const release = request.body.release as string
  // const publicKey = request.body.publicKey as string
  // const sig = request.body.sig as string

  // Verify signature
  // secp256k1.

  // const org = await polybase.collection<Org>('Org').record('polybase').get()
  // if (org.data.members.find((member) => member.id === publicKey)) {
  //   const error = new Error('Permission denied') as any
  //   error.statusCode = 401
  //   throw error
  // }

  // Get release info
  const releaseInfo = await polybase.collection('Release').record(release).get()

  if (!releaseInfo.data) {
    throw new Error('Release does not exist')
  }

  // Create a release for each repo that has a commit since the last release
  const repoChanges = await findReposWithCommitsSinceLastRelease(REPOS)

  // Create a release for each repo
  await Promise.all(repoChanges.map((repoPath) => {
    // Create a release PR for the repo
    console.log('Creating release branch for', repoPath, release)
    const [owner, repo] = repoPath.split('/')
    return createBranch(owner, repo, `release-${release}`).catch((e) => console.error(e))
  }))


  return response.json({
    status: 'OK',
    release,
  })
})

