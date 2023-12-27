Open Pdf
=================

Install by downloading the [latest version](https://github.com/retorquere/zotero-open-pdf/releases/latest). Compatible with Zotero 6 and 7.

Zotero allows you to set a default for opening PDFs from Zotero:

* with the system PDF viewer
* with the internal PDF editor

This plugin adds two things:

* adds an option to the right-click menu of items to open PDFs with opposite of what you have configured in Zotero (so open with system PDF viewer if you have configured Zotero to open with the internal editor, and vice versa
* allows you to add extra entries for your own PDF viewers/editor of choice

To add your own, go into the Zotero preferences, tab Advanced, and open the config editor (You will be warned that you can break things. Don't break things). The right-click and add a new String entry. The key must start with `extensions.zotero.open-pdf.with.`, add any name you want after it, eg `extensions.zotero.open-pdf.with.skim`, and as the value enter the command line needed to start the app, giving `@pdf` as a parameter where the filename must go. this could eg be

`extensions.zotero.open-pdf.with.preview` = `/usr/bin/open -a Preview @pdf`

which would add an option `Open with preview` to the menu. You can set your own menu label by adding it before the path in brackets:

`extensions.zotero.open-pdf.with.skim` = `[Open with Skim]/usr/bin/open -a Skim @pdf`

The plugin does not search the system PATH, you need to enter the full path to the executable.


# Warning

Modifying PDFs outside of Zotero (e.g., deleting, moving, or rotating pages) may result in inconsistencies with Zotero-created annotations!

Rotating and deleting individual pages can be done safely from the thumbnails tab of the Zotero PDF reader sidebar. Please consult Zotero's support pages about [using an external PDF reader](https://www.zotero.org/support/kb/annotations_in_database).

# Support - read carefully

My time is extremely limited for a number of very great reasons (you shall have to trust me on this). Because of this, I
cannot accept bug reports
or support requests on anything but the latest version. If you submit an issue report,
please include the version that you are on. By the time I get to your issue, the latest version might have bumped up
already, and you
will have to upgrade (you might have auto-upgraded already however) and re-verify that your issue still exists.
Apologies for the inconvenience, but such
are the breaks.

