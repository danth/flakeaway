const util = require('util')
const _ = require('lodash')
const { runNix } = require('./nix.js')

function removeEscapes(text) {
	return text
		.replace(/\x1b\[0m/g, '')
		.replace(/\x1b\[1m/g, '')
		.replace(/\x1b\[32;1m/g, '')
		.replace(/\x1b\[33;1m/g, '')
}

function blankBranches(line) {
	return line.replace(/[│├─└]/g, ' ')
}

function removeBranches(line) {
	return blankBranches(line).trim()
}

function removeDescription(line) {
	return line.replace(/: .*/, '')
}

function parseLine(line) {
	return {
		indentation: blankBranches(line).search(/\S|$/) / 4,
		name: removeDescription(removeBranches(line)),
	}
}

function buildTree(lines, depth) {
	const groups = []
	let group = []
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		if (line.indentation == depth) {
			if (group.length) groups.push(group)
			group = [line]
		} else {
			group.push(line)
		}
	}
	if (group.length) groups.push(group)

	return {
		name: lines[0].name,
		children: groups.map(group => buildTree(group, depth + 1)),
	}
}

function parse(text) {
	const lines = removeEscapes(text).split('\n')
	const parsedLines = lines.map(parseLine).filter(line => line.name.length)
	return buildTree(parsedLines, 1)
}

async function readFlake(url) {
	const { exitCode, stdout } = await runNix(["flake", "show", url])
	if (exitCode == 0) {
		return parse(stdout)
	} else {
		return null
	}
}

function findChild(tree, name) {
	return _.find(tree.children, child => child.name == name)
}

function getPaths(tree) {
	if (tree.children.length) {
		return _.flatMap(
			tree.children,
			child => getPaths(child).map(path => tree.name + '.' + path)
		)
	} else {
		return [tree.name]
	}
}

function getBuildableFragments(tree) {
	const fragments = []

	for (let outputName of ["checks", "packages"]) {
		const output = findChild(tree, outputName)
		if (output) getPaths(output).forEach(path => fragments.push(path))
	}

	const nixosConfigurations = findChild(tree, "nixosConfigurations")
	if (nixosConfigurations) getPaths(nixosConfigurations).forEach(
		path => fragments.push(`${path}.config.system.build.toplevel`)
	)

	return fragments
}

module.exports = { readFlake, getBuildableFragments }
