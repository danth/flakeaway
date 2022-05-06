import _ from 'lodash'
import { removeANSI } from './ansi.js'

export function formatLog(log) {
  if (!log) return undefined

  const truncatedMessage = 'Earlier lines of this build log were truncated.\n'
  const limit = 65535 - 8 - truncatedMessage.length

  const logLines = removeANSI(log).split('\n')

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

