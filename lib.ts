/* eslint-disable no-var, prefer-arrow/prefer-arrow-functions, @typescript-eslint/require-await */

// declare const dump: (msg: string) => void

import { DebugLog } from 'zotero-plugin/debug-log'
import { jwk as pubkey } from './public'
DebugLog.register('Open PDF', ['alt-open.', 'fileHandler.'], pubkey)

type ItemMenu = _ZoteroTypes.MenuManager.MenuData<_ZoteroTypes.MenuManager.LibraryMenuContext>

import unshell from 'shell-quote/parse'

import { log } from './lib/log'

log('lib loading')

const pluginID = 'zotero-open-pdf@iris-advies.com'

const Kinds = ['PDF', 'Snapshot', 'ePub']

type Opener = { label: string; cmdline: string }
function getOpener(opener: string): Opener {
  if (!opener) return { label: '', cmdline: '' }
  const cmdline = Zotero.Prefs.get(opener, true) as string
  if (!cmdline) return { label: '', cmdline: '' }
  const m = cmdline.match(/^\[(.+?)\](.+)/)
  if (m) return { label: m[1], cmdline: m[2] }
  return { label: `Open with ${opener.replace(/^extensions\.zotero\.alt-open\.[a-z]+\.with\./, '')}`, cmdline }
}

function exec(exe: string, args: string[] = []): void {
  log(`running ${JSON.stringify([exe].concat(args))}`)

  const cmd = Zotero.File.pathToFile(exe)
  if (!cmd.exists()) {
    flash('opening PDF failed', `${exe} not found`)
    return
  }
  if (!cmd.isExecutable()) {
    flash('opening PDF failed', `${exe} is not runnable`)
    return
  }

  const proc = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess)
  proc.init(cmd)
  proc.startHidden = true
  proc.runw(false, args, args.length)
}

function flash(title: string, body?: string, timeout = 8): void {
  try {
    log(`flash: ${JSON.stringify({ title, body })}`)
    const pw = new Zotero.ProgressWindow()
    pw.changeHeadline(`open-pdf ${title}`)
    if (!body) body = title
    if (Array.isArray(body)) body = body.join('\n')
    pw.addDescription(body)
    pw.show()
    pw.startCloseTimer(timeout * 1000)
  }
  catch (err) {
    const msg = `${err}`
    log(`flash: ${JSON.stringify({ title, body, err: msg })}`)
  }
}

async function selectedAttachment(kind: string) {
  const items = Zotero.getActiveZoteroPane().getSelectedItems()
  if (items.length !== 1) return null
  const attachment = items[0].isAttachment() ? items[0] : await items[0].getBestAttachment()
  if (!attachment) return null
  if (!attachment.getFilePath()) return null
  switch (kind) {
    case 'pdf':
      if (!attachment.isPDFAttachment()) return null
      break
    case 'snapshot':
      if (!attachment.isSnapshotAttachment()) return null
      break
    case 'epub':
      if (!attachment.isEPUBAttachment()) return null
      break
    default:
      return null
  }
  return attachment
}

export class ZoteroAltOpenPDF {
  shutdown() {
    log('shutdown done')
  }

  public async startup() {
    for (const kind of Kinds.map(k => k.toLowerCase())) {
      const prefix = `extensions.zotero.open-${kind}.with.`
      for (const old of Zotero.Prefs.rootBranch.getChildList(prefix) as string[]) {
        const migrated = old.replace(prefix, `alt-open.${kind}.with.`)
        Zotero.Prefs.set(old.replace(prefix, `alt-open.${kind}.with.`), Zotero.Prefs.get(old, true))
        Zotero.Prefs.clear(old, true)
      }
    }

    log('startup')
    await this.onMainWindowLoad({ window: Zotero.getMainWindow() })
    log('startup done')
  }

  public async onMainWindowLoad({ window }) {
    log('onMainWindowLoad')

    for (const Kind of Kinds) {
      const kind = Kind.toLowerCase()
      if (window.document.getElementById(`alt-open-${kind}-internal`)) continue

      // filehandler: '' == internal, 'system' = system, other = custom
      const system: ItemMenu[] = [
        {
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', Zotero.getString('locate.internalViewer.label') as string)
            // : internal is not the default
            context.setVisible(Zotero.Prefs.get(`fileHandler.${kind}`) && !!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            Zotero.Reader.open((await selectedAttachment(kind))!.id, undefined, { openInWindow: false })
          },
        },
        {
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', Zotero.getString('locate.externalViewer.label') as string)
            // system is not the default
            context.setVisible(Zotero.Prefs.get(`fileHandler.${kind}`) !== 'system' && !!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            Zotero.launchFile((await selectedAttachment(kind))!.getFilePath() as string)
          },
        },
      ]

      const placeholder = new RegExp(`@${kind}`, 'i')
      const custom: ItemMenu[] = (Zotero.Prefs.rootBranch.getChildList(`extensions.zotero.alt-open.${kind}.with.`) as string[])
        .map(cmdline => getOpener(cmdline))
        .filter(opener => opener.label && opener.cmdline)
        .map(opener => ({
          menuType: 'menuitem',
          onShowing: async (_event, context) => {
            context.menuElem.setAttribute('label', opener.label)
            context.setVisible(!!(await selectedAttachment(kind)))
          },
          onCommand: async (_event, _context) => {
            let args: string[] = unshell(opener.cmdline)
            const cmd = args.shift()
            const pdf = await selectedAttachment(kind)
            exec(cmd, args.map((arg: string) => arg.replace(placeholder, pdf.getFilePath() as string)))
          },
        }))

      if (custom.length) {
        Zotero.MenuManager.registerMenu({
          menuID: `${pluginID}-menu-item`,
          pluginID,
          target: 'main/library/item',
          menus: [{
            menuType: 'submenu',
            onShowing: async (_event, context) => {
              context.menuElem.setAttribute('label', `Open ${Kind}`)
              context.setVisible(!!(await selectedAttachment(kind)))
            },
            menus: [...system, ...custom],
          }],
        })
      }
      else {
        Zotero.MenuManager.registerMenu({
          menuID: `${pluginID}-menu-item`,
          pluginID,
          target: 'main/library/item',
          menus: system,
        })
      }
    }
    log('onMainWindowLoad done')
  }

  public async onMainWindowUnLoad() {
    log('onMainWindowUnload done')
  }
}
Zotero.AltOpenPDF = Zotero.AltOpenPDF || new ZoteroAltOpenPDF()
log('lib loaded')
