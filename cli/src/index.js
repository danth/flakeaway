#!/usr/bin/env node

import enquirer from 'enquirer'
import fs from 'fs'
import { encryptSecret } from './secrets.js'

const config =
	fs.existsSync('.flakeaway.json')
	? JSON.parse(fs.readFileSync('.flakeaway.json'))
	: {}

const STORES = {
	'Cachix': {
		type: 'cachix',
		questions: [
			{
				name: 'store',
				type: 'input',
				message: 'What is the cache name?'
			},
			{
				name: 'authToken',
				type: 'input',
				message: 'Paste an auth token with write access to this cache:',
				result: encryptSecret
			}
		]
	}
}

const ACTIONS = {
	'Add an output store': async () => {
		const { type } = await enquirer.prompt({
			name: 'type',
			type: 'select',
			message: 'Which type of output store are you adding?',
			choices: Object.keys(STORES)
		})

		const definition = STORES[type]
		const store = await enquirer.prompt(definition.questions)
		store.type = definition.type

		if (!config.outputStores) { config.outputStores = [] }
		config.outputStores.push(store)
	},

	'Remove an output store': async () => {
		if (!config.outputStores) {
			console.log('There are no output stores configured!')
			return
		}

		const { removeStore } = await enquirer.prompt({
			name: 'removeStore',
			type: 'select',
			message: 'Which output store would you like to remove?',
			choices: config.outputStores.map(store => store.store)
		})

		config.outputStores = config.outputStores.filter(store => store.store != removeStore)
		if (!config.outputStores.length) { delete config['outputStores'] }
	},

	'Save and exit': async () => {
		if (Object.keys(config).length) {
			// We only save the config when an option is set
			console.log('Saving to .flakeaway.json')
			const stringConfig = JSON.stringify(config, null, '\t')
			fs.writeFileSync('.flakeaway.json', stringConfig)
		} else {
			// Otherwise, we delete it
			if (fs.existsSync('.flakeaway.json')) {
				console.log('Deleting empty .flakeaway.json')
				fs.unlinkSync('.flakeaway.json')
			}
		}

		process.exit(0)
	}
}

while (true) {
	// Add a line break between actions
	console.log()

	const { action } = await enquirer.prompt({
		name: 'action',
		type: 'select',
		message: 'What would you like to do?',
		choices: Object.keys(ACTIONS)
	})

	await ACTIONS[action]()
}
