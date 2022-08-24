import fs from 'fs'
import crypto from 'crypto'
import { Validator } from 'jsonschema'
import SCHEMA from './schema.json' assert {type: 'json'}

export function loadConfig(content) {
	let config
	try {
		config = JSON.parse(content)
	} catch {
		// Syntax error
		return {}
	}

	const validator = new Validator();
	const result = validator.validate(config, SCHEMA)

	if (!result.valid) {
		// TODO: Present config errors to the user
		console.log(result.errors)
	}

	return result.valid ? config : {}
}

const ENCRYPTION_SETTINGS = {
	key: fs.readFileSync('secrets_private_key.pem', 'utf8'),
	padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
	oaepHash: 'sha256'
}

export function decryptSecret(secret) {
	const secretBuffer = Buffer.from(secret, 'base64')
	const decryptedBuffer = crypto.privateDecrypt(ENCRYPTION_SETTINGS, secretBuffer)
	return decryptedBuffer.toString()
}
