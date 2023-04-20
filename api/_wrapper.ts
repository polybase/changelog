import type { VercelRequest, VercelResponse } from '@vercel/node'
import Cors from 'cors'

const cors = Cors({
  methods: ['POST', 'GET', 'HEAD'],
})

export function wrapper(
  fn: (
    request: VercelRequest,
    response: VercelResponse,
  ) => Promise<VercelResponse>,
) {
  return async (
    request: VercelRequest,
    response: VercelResponse,
  ): Promise<void> => {
    try {
      // CORS
      await new Promise((resolve, reject) => {
        cors(request, response, (result: any) => {
          if (result instanceof Error) {
            return reject(result)
          }
          return resolve(result)
        })
      })
      await fn(request, response)
    } catch (e: any) {
      if (!response.statusCode || e?.message) response.statusCode = 500
      if (process.env.NODE_EV !== 'production') console.error(e)
      response.json({
        error: {
          message: e?.message ?? 'Unexpected error',
        },
      })
    }
  }
}

