import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'

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
  date?: number;
  published: boolean;

  @delegate
  org: Org;

  @index(org, id);

  constructor (id: string, org: Org, date?: number) {
    this.id = id;
    this.date = date;
    this.org = org;
    this.published = true;
  }

  publish () {
    this.published = true;
  }
}

@read
collection Change {
  id: string;
  type: string; // added, removed, fixed, deprecated
	desc: string;
  tags: string[];
  release: Release;

  constructor (id: string, release: Release, type: string, desc: string, tags: Tag[]) {
    this.id = id;
    this.release = release;
    this.desc = desc;
    this.type = type;
    this.tags = [];
  }

  @call(release)
  update (type: string, desc: string, tags: string[]) {
    this.type = type;
    this.desc = desc;
    this.tags = tags;
  }

  addRelease (release: Realease) {
    this.release = release;
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

  // await db.collection('User').create([])
  // await db.collection('Org').create([
  //   'polybase',
  //   'Polybase',
  //   db.collection('User')
  //     .record('0x4cb3281be4f42b80966b7b86bbb99e56e8a7729975af16ba492d82dcc0e41a5b746bee51a3ab9b6e9045d385e482c9bedd5ab7777f594ffd1c76ee82f1ce9b25'),
  // ])

  return 'Schema loaded'
}

load()
  .then(console.log)
  .catch(console.error)
