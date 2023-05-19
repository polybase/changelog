import type { VercelRequest, VercelResponse } from '@vercel/node'
import { wrapper } from './_wrapper'
import { polybase } from './_polybase'
import { sendMessage } from './_discord'
import { Change } from './_types'

export default wrapper(async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  // Body parameters
  const release = request.body.release as string

  // Get release info
  const releaseInfo = await polybase.collection('Release').record(release).get()

  // Check release exists
  if (!releaseInfo.data) {
    throw new Error('Release does not exist')
  }

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

