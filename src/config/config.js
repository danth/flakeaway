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
