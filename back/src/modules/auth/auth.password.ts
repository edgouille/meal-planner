import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}
const hashPattern = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/
const dummySalt = randomBytes(16)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await deriveKey(password, salt)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash?: string): Promise<boolean> {
  const match = storedHash?.match(hashPattern)
  // Perform the same derivation even when the account does not exist.
  const key = await deriveKey(password, match ? Buffer.from(match[1], 'hex') : dummySalt)
  return !!match && timingSafeEqual(key, Buffer.from(match[2], 'hex'))
}
