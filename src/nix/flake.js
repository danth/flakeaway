import _ from 'lodash'
import { runNix } from './nix.js'

export async function readFlake(url) {
	const { exitCode, stdout } = await runNix(['flake', 'show', url, '--json'])
	if (exitCode == 0) {
		return JSON.parse(stdout)
	} else {
		return null
	}
}

// Convert the output of `nix flake show --json` into a list of
// strings like 'packages.x86_64-linux.example'.
function getPaths(tree) {
	return _.flatMap(
		Object.entries(tree),
		([key, subtree]) => {
			if (subtree.hasOwnProperty('type')) {
				return key
			} else {
				return getPaths(subtree).map(path => `${key}.${path}`)
			}
		}
	)
}

export function getBuildableFragments(flake) {
	return getPaths(flake)
		.map(path => {
			if (path.startsWith('nixosConfigurations')) {
				return `${path}.config.system.build.toplevel`
			}
			if (path.startsWith('checks') || path.startsWith('packages')) {
				return path
			}
		})
		.filter(path => path != null)
}
