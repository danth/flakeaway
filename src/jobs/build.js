import _ from 'lodash'
import formatDuration from 'humanize-duration'
import filesize from 'filesize'
import { markdownTable } from 'markdown-table'
import { v4 as uuidv4 } from 'uuid'
import { githubFlakeUrl, reducePayload } from '../github.js'
import { removeANSI } from '../ansi.js'
import { nixBuild } from '../nix/build.js'

const formatSize = filesize.partial({base: 2})

function formatLog(stdout) {
  if (!stdout) return undefined

  const truncatedMessage = 'Earlier lines of this build log were truncated.\n'
  const limit = 65535 - 8 - truncatedMessage.length

  const logLines = removeANSI(stdout).split('\n')

  var totalLength = 0
  const truncatedLines = _.takeRightWhile(
    logLines,
    line => {
      totalLength += line.length + 1
      return totalLength <= limit
    }
  )

  const truncatedLog = truncatedLines.join('\n')

  const prefix = truncatedLines.length < logLines.length ? truncatedMessage : ''

  return prefix + '```\n' + truncatedLog + '\n```'
}

function formatStatistics(statistics) {
  let document = '### Evaluation analysis\n\n'

  const heapSize = formatSize(statistics.gc.heapSize)
  const totalBytes = formatSize(statistics.gc.totalBytes)
  document += `The heap had a total size of **${heapSize}**, and **${totalBytes}** of memory was allocated. `

  const thunks = statistics.nrThunks
  document += `**${thunks} thunks** were created on the heap.\n`

  // TODO: What is being avoided?
  // const avoided = statistics.nrAvoided
  // document += `**${avoided}** avoided. `

  document += 'The following table is a breakdown of usage, categorised by type:\n\n'
  document += markdownTable(
    [
      // Headings
      [null, 'Memory use', 'Count', 'Elements', 'Copied elements', 'Merges', 'Lookups'],
      // Data
      [
        '**Symbols**',
        formatSize(statistics.symbols.bytes),
        statistics.symbols.number
      ],
      [
        '**Values**',
        formatSize(statistics.values.bytes),
        statistics.values.number
      ],
      [
        '**Lists**',
        formatSize(statistics.list.bytes),
        statistics.list.elements,
        null,
        null,
        statistics.list.concats
      ],
      [
        '**Sets**',
        formatSize(statistics.sets.bytes),
        statistics.sets.number,
        statistics.sets.elements,
        statistics.nrOpUpdateValuesCopied,
        statistics.nrOpUpdates,
        statistics.nrLookups
      ],
      [
        '**Environments**',
        formatSize(statistics.envs.bytes),
        statistics.envs.number
      ]
    ],
    {
      align: 'c',
      // We do not need the raw markdown to be readable
      padding: false,
      alignDelimiters: false
    }
  )

  const cpuTime = formatDuration(
    statistics.cpuTime * 1000,
    { maxDecimalPoints: 3 }
  )
  document += `\n\nEvaluation of this fragment consumed **${cpuTime}** of processor time.\n\n`

  const primitives = statistics.nrPrimOpCalls
  const functions = statistics.nrFunctionCalls
  document += `There were **${primitives} primitive** calls and **${functions} function** calls. `

  document += 'These functions were called most often:\n\n'
  document += markdownTable(
    [
      // Headings
      [ 'Function', 'Calls', 'File', 'Line', 'Column' ],
      // Data
      ...statistics.functions
        // Ignore anonymous functions
        .filter(f => f.name)
        // Sort by number of calls, greatest first
        .sort((a, b) => b.count - a.count)
        // Only display the top 10 most called functions
        .slice(0, 10)
        .map(f => [
          '`' + f.name + '`',
          f.count,
          '`' + f.file + '`',
          f.line,
          f.column
        ])
    ],
    {
      align: ['l', 'c', 'l'],
      // We do not need the raw markdown to be readable
      padding: false,
      alignDelimiters: false
    }
  )

  document += '\n\nNote: these statistics are only relevant to the evaluation phase, which is '
  document += 'where Nix code is processed to determine which packages are going to be built. '
  document += 'They do not take into account the resources used to actually build those packages.'

  return document
}

export async function createBuild({ octokit, queue, target, fragment }) {
  const id = uuidv4()
  const { owner, repo, head_sha } = target

  const check_run = await octokit.rest.checks.create({
    owner, repo, head_sha,
    external_id: id,
    name: `Build ${fragment}`,
    status: 'queued',
  })

  await queue.add('build', {
    target, fragment,
    check_run_id: check_run.data.id,
  }, {
    jobId: id,
    priority: 2,
    removeOnFail: true,
    removeOnComplete: true,
  })

  console.log(`Created build ${id}`)
}

export async function rerequestBuild({ octokit, payload, queue }) {
  await createBuild({
    octokit, queue,
    target: reducePayload(payload),
    /* .slice(6) removes 'Build ' from the start of the name,
     * leaving the fragment to be rebuilt.
     * TODO: Determine the rerequested fragment more reliably.
     */
    fragment: payload.check_run.name.slice(6),
  })
}

export async function runBuild({ app, job }) {
  console.log(`Running build ${job.id}`)

  const { owner, repo, installation_id } = job.data.target
  const { fragment, check_run_id } = job.data
  const octokit = await app.getInstallationOctokit(installation_id)
  const url = await githubFlakeUrl({ octokit, target: job.data.target })

  await octokit.rest.checks.update({
    owner, repo, check_run_id,
    status: 'in_progress',
  })

  const result = await nixBuild(job, url, fragment)

  const { success, systemError } = result
  const log = formatLog(result.log)
  const statistics = formatStatistics(result.statistics)

  if (success) {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'success',
      output: {
        title: 'Build succeeded',
        summary: 'This fragment was built or substituted successfully.\n\n' + statistics,
        text: log
      }
    })
    console.log(`Finished build ${job.id}`)
  } else if (systemError) {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'skipped',
      output: {
        title: 'Build unavailable',
        summary: 'This fragment cannot be built as it requires a platform which is not supported.\n\n' + statistics,
        text: log
      }
    })
    console.log(`Skipped build ${job.id}`)
  } else {
    await octokit.rest.checks.update({
      owner, repo, check_run_id,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'Build failed',
        summary: 'There was an error during the build or substitution of this fragment.\n\n' + statistics,
        text: log
      }
    })
    console.log(`Failed to build ${job.id}`)
  }
}
