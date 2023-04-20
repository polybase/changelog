import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ''

async function load() {
  const db = new Polybase({
    baseURL: `${process.env.REACT_APP_API_URL}/v0`,
    signer: async (data) => {
      const privateKey = Buffer.from(PRIVATE_KEY, 'hex')
      return { h: 'eth-personal-sign', sig: ethPersonalSign(privateKey, data) }
    },
    defaultNamespace: 'polybase/apps/changelog',
  })

  if (!PRIVATE_KEY) {
    throw new Error('No private key provided')
  }

  // MUST DELETE CHANGES FIRST (otherwise permissions won't work)
  const changes = await db.collection('Change').get()
  await Promise.all(changes.data.map((change) => db.collection('Change').record(change.data.id).call('del').catch(() => null)))

  const releases = await db.collection('Release').get()
  await Promise.all(releases.data.map((release) => db.collection('Release').record(release.data.id).call('del')))

  return 'Data deleted'
}

load()
  .then(console.log)
  .catch(console.error)

