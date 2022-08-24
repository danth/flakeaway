import fs from 'fs'
import crypto from 'crypto'

const PUBLIC_KEY = fs.readFileSync('secrets_public_key.pem', 'utf8')
const PRIVATE_KEY = fs.readFileSync('secrets_private_key.pem', 'utf8')

const DECRYPTION_SETTINGS = {
	key: PRIVATE_KEY,
	padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
	oaepHash: 'sha256'
}

export function decryptSecret(secret) {
	const secretBuffer = Buffer.from(secret, 'base64')
	const decryptedBuffer = crypto.privateDecrypt(DECRYPTION_SETTINGS, secretBuffer)
	return decryptedBuffer.toString()
}

export function initializeSecretsApi(expressApp) {
	expressApp.get('/api/secrets_public_key', (request, response) => {
		response.send(PUBLIC_KEY)
	})
}
