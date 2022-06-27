declare const Zotero: any
// declare const Components: any

Zotero.debug(`OpenPDFExternal: ${!!Zotero.OpenPDFExternal}`)
if (!Zotero.OpenPDFExternal) {
  const monkey_patch_marker = 'OpenPDFMonkeyPatched'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-inner-declarations, prefer-arrow/prefer-arrow-functions
  function patch(object, method, patcher) {
    if (object[method][monkey_patch_marker]) return
    object[method] = patcher(object[method])
    object[method][monkey_patch_marker] = true
  }

  class OpenPDFExternal { // tslint:disable-line:variable-name
    private initialized = false
    private globals: Record<string, any>

    // eslint-disable-next-line @typescript-eslint/require-await
    public async load(globals: Record<string, any>) {
      this.globals = globals

      if (this.initialized) return
      this.initialized = true

      patch(this.globals.Zotero_LocateMenu, 'buildContextMenu', original => async function Zotero_LocateMenu_buildContextMenu(menu: HTMLElement, _showIcons: boolean): Promise<void> {
        await original.apply(this, arguments) // eslint-disable-line prefer-rest-params

        let sibling: HTMLElement
        for (const mi of menu.children as unknown as HTMLElement[]) {
          if (mi.style?.listStyleImage !== 'url("chrome://zotero/skin/treeitem-attachment-pdf.png")') continue

          if (mi.getAttribute('zotero-open-pdf-external')) {
            sibling = null
            break
          }

          sibling = mi
        }

        if (sibling) {
          const menuitem = globals.document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menuitem')
          for (const att of sibling.attributes) {
            menuitem.setAttribute(att.nodeName, att.nodeValue)
          }
          menuitem.setAttribute('zotero-open-pdf-external', 'true')

          if (Zotero.Prefs.get('fileHandler.pdf')) { // existing Open option = external
            menuitem.setAttribute('label', Zotero.getString('locate.internalViewer.label') as string)
            menuitem.addEventListener('command', async event => {
              event.stopPropagation()
              const items = globals.ZoteroPane_Local.getSelectedItems()
              for (const item of items) {
                const attachment = item.isAttachment() ? item : (await item.getBestAttachment())
                if (attachment?.attachmentPath.match(/[.]pdf$/i)) {
                  await Zotero.Reader.open(attachment.itemID, false, { openInWindow: false })
                }
              }
            }, false)
          }
          else { // existing Open option = internal
            menuitem.setAttribute('label', Zotero.getString('locate.externalViewer.label') as string)
            menuitem.addEventListener('command', async event => {
              event.stopPropagation()
              const items = globals.ZoteroPane_Local.getSelectedItems()
              for (const item of items) {
                const attachment = item.isAttachment() ? item : (await item.getBestAttachment())
                if (attachment?.attachmentPath.match(/[.]pdf$/i)) {
                  Zotero.launchFile(attachment.getFilePath())
                }
              }
            }, false)
          }

          // sibling.after(menuitem)
          sibling.parentNode.insertBefore(menuitem, sibling.nextSibling)
        }
      })
    }
  }

  Zotero.OpenPDFExternal = new OpenPDFExternal
}
