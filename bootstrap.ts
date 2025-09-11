declare const Zotero: any
declare const Services: any
declare const ChromeUtils: any
declare const Components: any
declare const dump: (msg: string) => void
const {
  interfaces: Ci,
  results: Cr,
  utils: Cu,
  Constructor: CC,
} = Components

var stylesheetID = 'zotero-alt-open-pdf-stylesheet'
var ftlID = 'zotero-alt-open-pdf-ftl'
var menuitemID = 'make-it-green-instead'
var addedElementIDs = [stylesheetID, ftlID, menuitemID]

import { bootstrapLog as log } from './lib/log'

export async function install(): Promise<void> {
}

export async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }): Promise<void> {
  log('startup')

  // Add DOM elements to the main Zotero pane
  try {
    log('loading lib')
    Services.scriptloader.loadSubScript(`${rootURI}lib.js`, { Zotero })
    log(`lib loaded: ${Zotero.AltOpenPDF.startup}`) // eslint-disable-line @typescript-eslint/no-unsafe-argument
    await Zotero.AltOpenPDF.startup()
    log('started')
  }
  catch (err) {
    log(`startup error: ${err}`)
  }
}

export async function onMainWindowLoad({ window }) {
  await Zotero.AltOpenPDF.onMainWindowLoad({ window })
}

export async function onMainWindowUnload({ window }) {
  await Zotero.AltOpenPDF.onMainWindowUnload({ window })
}

export async function shutdown() {
  log('Shutting down')

  if (Zotero.AltOpenPDF) {
    try {
      await Zotero.AltOpenPDF.shutdown()
    }
    catch (err) {
      log(`shutdown error: ${err}`)
    }
    delete Zotero.AltOpenPDF
  }
}

export function uninstall() {
}
