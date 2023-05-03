import type { VercelRequest, VercelResponse } from '@vercel/node'
import { wrapper } from './_wrapper'
import { polybase } from './_polybase'
import { createRelease } from './_github'
import { sendMessage } from './_discord'

interface Org {
  name: string
  members: { collectionId: string, id: string }[]
}

export interface Change {
  id: string
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated'
  desc: string
  tags: string[]
  release: { collectionId: string, id: string }
}

export default wrapper(async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  // Body parameters
  const release = request.body.release as string
  const publicKey = request.body.publicKey as string
  const sig = request.body.sig as string

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

  // Get the list of changes for the release
  const changes = await polybase.collection<Change>('Change')
    .where('release', '==', polybase.collection('Release').record(release))
    .get()

  // Create a release for each repo
  const repoChanges: Record<string, Change[]> = {}
  changes.data.forEach((change) => {
    change.data.tags.forEach((tag) => {
      if (!repoChanges[tag]) repoChanges[tag] = []
      repoChanges[tag].push(change.data)
    })
  })

  // Create a release for each repo
  await Promise.all(Object.keys(repoChanges).map((repo) => {
    const changes = repoChanges[repo]
    // Create a release for the repo
    console.log('Creating release for', repo, release)
    return createRelease('polybase', repo, release, `## ${release} - ${new Date(releaseInfo.data.date * 1000).toDateString()}\n\n${changes.map((change) => `* [${change.type}] ${change.desc} (${change.tags.join(', ')})`).join('\n\n')}`)
  }))

  // Send a notification to discord
  const desc = changes.data.map((change) => `  - ${change.data.type}: ${change.data.desc} [${change.data.tags?.join(', ')}]`).join('\n\n')
  await sendMessage(`:rocket: v${release}\n\n${desc}`).catch(() => null)

  // Mark as complete
  await polybase.collection('Release').record(release).call('publish', [])

  return response.json({
    status: 'OK',
    release,
  })
})

