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

function log(msg) {
  Zotero.debug(`AltOpen PDF: (bootstrap) ${msg}`)
}

export async function install(): Promise<void> {
}

export async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }): Promise<void> {
  log('Starting')

  // Add DOM elements to the main Zotero pane
  try {
    log('loading lib')
    var win = Zotero.getMainWindow()
    Services.scriptloader.loadSubScript(`${rootURI}lib.js`, { Zotero })
    log(`AltOpen PDF: lib loaded: ${Object.keys(Zotero.AltOpenPDF)}`) // eslint-disable-line @typescript-eslint/no-unsafe-argument
    Zotero.AltOpenPDF.startup()
    log('AltOpen PDF: started')
  }
  catch (err) {
    log(`AltOpen PDF: startup error: ${err}`)
  }
}

export function shutdown() {
  log('Shutting down')

  if (Zotero.AltOpenPDF) {
    try {
      Zotero.AltOpenPDF.shutdown()
      delete Zotero.AltOpenPDF
    }
    catch (err) {
      log(`shutdown error: ${err}`)
    }
  }
}

export function uninstall() {
  // `Zotero` object isn't available in `uninstall()` in Zotero 6, so log manually
  if (typeof Zotero == 'undefined') {
    dump('AltOpen PDF: Uninstalled\n\n')
    return
  }

  log('Uninstalled')
}
