import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'
import { nanoid } from 'nanoid'
import importedData from './data.json'

export interface JsonChange {
  id: string // 0.3.10
  date: string
  type: 'added' | 'removed' | 'fixed' | 'deprecated'
  desc: string
  tags: string[]
}

export interface Release {
  id: string
  date: number
  major: number
  minor: number
  patch: number
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
      major: parseInt(change.id.split('.')[0]),
      minor: parseInt(change.id.split('.')[1]),
      patch: parseInt(change.id.split('.')[2]),
      date: Math.floor((new Date(change.date)).getTime() / 1000),
    })
  })

  const org = db.collection('Org').record('polybase')

  await Promise.all(releases.map(async ({ id, major, minor, patch, date }) => {
    console.log('release', id)
    return db.collection('Release').create([id, major, minor, patch, org, date])
  }))

  const changes = data.map((change) => ({
    id: nanoid(),
    type: change.type,
    desc: change.desc,
    tags: change.tags ?? [],
    release: db.collection('Release').record(change.id),
    date: Math.floor((new Date(change.date)).getTime() / 1000),
  }))

  for (let change in changes) {
    const { id, release, type, desc, tags, date } = changes[change]
    console.log('change', id, release.id)
    await db.collection('Change').create([id, release, type, desc, tags, date])
  }

  // await Promise.all(changes.map(async ({ id, release, type, desc, tags, date }) => {
  //   console.log('change', id, release.id)
  //   return db.collection('Change').create([id, release, type, desc, tags, date])
  // }))

  return 'Data loaded'
}

load()
  .then(console.log)
  .catch(console.error)

