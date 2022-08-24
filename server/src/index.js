import Queue from 'bull'
import express from 'express'
import { initializeGitHub } from './forges/github.js'
import { initializeSecretsApi } from './config/secrets.js'
import { runEvaluation } from './jobs/evaluate.js'
import { runBuild } from './jobs/build.js'

function logJobError(job, error) {
  console.error(`${job.id} encountered an error:`)
  console.error(error)
}

const BUILD_CONCURRENCY = parseInt(process.env.BUILD_CONCURRENCY)
const EVALUATION_CONCURRENCY = parseInt(process.env.EVALUATION_CONCURRENCY)

const buildQueue = new Queue('builds', { redis: { path: process.env.REDIS } })
buildQueue.on('failed', logJobError)
buildQueue.process(BUILD_CONCURRENCY, job => runBuild({ job }))

const evaluationQueue = new Queue('evaluations', { redis: { path: process.env.REDIS } })
evaluationQueue.on('failed', logJobError)
evaluationQueue.process(EVALUATION_CONCURRENCY, job => runEvaluation({ job, buildQueue }))

process.on('SIGTERM', async () => {
  console.info('Waiting for current jobs to finish')

  await Promise.all([
    buildQueue.pause(true),
    evaluationQueue.pause(true)
  ])

  await Promise.all([
    buildQueue.close(),
    evaluationQueue.close()
  ])

  process.exit(0)
})

const expressApp = express()
initializeGitHub({ expressApp, evaluationQueue, buildQueue })
initializeSecretsApi(expressApp)
expressApp.listen(15345)
