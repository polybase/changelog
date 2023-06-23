import type { VercelRequest, VercelResponse } from '@vercel/node'
import { wrapper } from './_wrapper'
import { findCommitsSinceLastRelease } from './_github'
import { REPOS } from './_repos'

export default wrapper(async function handler(
  _: VercelRequest,
  response: VercelResponse,
): Promise<VercelResponse> {
  const commits = await findCommitsSinceLastRelease(
    REPOS,
  )

  return response.json(commits)
})

