import { Polybase } from '@polybase/client'
import { ethPersonalSign } from '@polybase/eth'

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? ''

console.log(process.env.REACT_APP_API_URL)

export const polybase = new Polybase({
  baseURL: `${process.env.REACT_APP_API_URL}/v0`,
  signer: async (data) => {
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex')
    return { h: 'eth-personal-sign', sig: ethPersonalSign(privateKey, data) }
  },
  defaultNamespace: 'polybase/apps/changelog',
})