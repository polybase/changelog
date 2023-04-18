import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'
import { nanoid } from 'nanoid'
import importedData from './data.json'

export interface JsonChange {
  id: string // 0.3.10
  date: number
  type: 'added' | 'removed' | 'fixed' | 'deprecated'
  desc: string
  tags: string[]
}

export interface Release {
  id: string
  date: number
}

export interface Change {
  id: string
  type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated'
  desc: string
  tags: string[]
}
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

  const data = importedData as JsonChange[]

  const releasesCache: Record<string, boolean> = {}
  const releases: Release[] = []
  data.forEach((change) => {
    if (releasesCache[change.id]) return
    releasesCache[change.id] = true
    releases.push({
      id: change.id,
      date: change.date,
    })
  })

  const org = db.collection('Org').record('polybase')

  await Promise.all(releases.map(({ id, date }) => {
    return db.collection('Release').create([id, org, date])
  }))

  const changes = data.map((change) => ({
    id: nanoid(),
    type: change.type,
    desc: change.desc,
    tags: change.tags ?? [],
    release: db.collection('Release').record(change.id),
  }))

  await Promise.all(changes.map(({ id, release, type, desc, tags }) => {
    return db.collection('Change').create([id, release, type, desc, tags])
  }))

  return 'Data loaded'
}

load()
  .then(console.log)
  .catch(console.error)
