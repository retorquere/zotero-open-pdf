const run = Zotero.Utilities.generateObjectKey()

export function log(msg) {
  Zotero.debug(`AltOpen PDF [${run}]: ${msg}`)
}

export function bootstrapLog(msg) {
  Zotero.debug(`AltOpen PDF: (bootstrap [${run}]) ${msg}`)
}
