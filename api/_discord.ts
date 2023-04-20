import axios from 'axios'

// Replace with your webhook URL
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? ''

export async function sendMessage(content: string) {
  if (!DISCORD_WEBHOOK_URL) return
  await axios.post(
    DISCORD_WEBHOOK_URL,
    { content },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}



