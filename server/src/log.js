import _ from "lodash";

const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
export function removeANSI(log) {
  return log.replace(ANSI, "");
}

const SYSTEM_ERROR = /^error: a '\S+' with features {.*} is required to build '\S+'/m;
export function isSystemError(log) {
  return SYSTEM_ERROR.test(removeANSI(log));
}

export function formatLog(logs) {
  if (!logs) return undefined;
  if (!logs.log.length) return undefined;

  const title = `### Build log for ${logs.drv}\n`;
  const truncatedMessage = "Earlier lines of this log were truncated.\n";
  const limit = 65535 - 7 - truncatedMessage.length - title.length;

  const logLines = removeANSI(logs.log).split("\n");

  var totalLength = 0;
  const truncatedLines = _.takeRightWhile(logLines, (line) => {
    totalLength += line.length + 1;
    return totalLength <= limit;
  });

  const truncatedLog = truncatedLines.join("\n");

  const prefix = truncatedLines.length < logLines.length ? truncatedMessage : "";

  return title + prefix + "```\n" + truncatedLog + "```";
}
