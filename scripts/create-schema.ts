import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'
import { decodeFromString, encodeToString, secp256k1 } from '@polybase/util'

export interface User {
  id: string
}

const schema = `
@public
collection User {
  id: string;

  @delegate
  publicKey: PublicKey;

  constructor () {
    this.id = ctx.publicKey.toHex();
    this.publicKey = ctx.publicKey;
  }
}

@read
collection Org {
  id: string;
  name: string;

  @delegate
  members: User[];

  constructor (id: string, name: string, member: User) {
    this.id = id;
    this.name = name;
    this.members = [member];
  }

  @call(members)
  addMember (user: User) {
    this.members.push(user);
  }
}

@read
collection Release {
	id: string;
  major: number;
  minor: number;
  patch: number;
  date?: number;
  published: boolean;

  @delegate
  org: Org;

  @index(org, date);
  @index(org, [major, desc], [minor, desc], [patch, desc]);
  @index(org, published, date);

  constructor (id: string, major: number, minor: number, patch: number, org: Org, date?: number) {
    this.id = id;
    this.date = date;
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.org = org;
    this.published = false;
  }

  @call(org)
  publish () {
    this.published = true;
  }

  @call(org)
  del () {
    selfdestruct();
  }
}

@read
collection Change {
  id: string;
  type: string; // added, removed, fixed, deprecated
	desc: string;
  tags: string[];
  release: Release;
  date?: number;

  @index(release, date);

  constructor (id: string, release: Release, type: string, desc: string, tags?: string[], date?: number) {
    this.id = id;
    this.release = release;
    this.desc = desc;
    this.type = type;
    this.tags = tags;
    this.date = date;
  }

  @call(release)
  update (type: string, desc: string, tags: string[]) {
    this.type = type;
    this.desc = desc;
    this.tags = tags;
  }

  @call(release)
  del () {
    selfdestruct();
  }
}
`

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

  await db.applySchema(schema)

  // Create the user
  // await db.collection<User>('User').create([]).catch(() => console.log)

  // // Create the org
  // const pk1 = encodeToString(secp256k1.getPublicKey(decodeFromString(PRIVATE_KEY, 'hex')).slice(1), 'hex')
  // await db.collection('Org').create(['polybase', 'Polybase', db.collection('User').record(pk1)])

  // Add member
  // const pk2 = '0xea448a816eba719df5155f1799d014d6ce74638fc5d42780597ad7e9df046a486ba295ed1c8364d284c416b350ba6b4e4db4966faf053e98cca6cab9fd6aa266'
  // await db.collection('Org').record('polybase').call('addMember', [db.collection('User').record(pk2)])

  return 'Schema loaded'
}

load()
  .then(console.log)
  .catch(console.error)
