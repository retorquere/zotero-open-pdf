Open PDF
=================

Install by downloading the [latest version](https://github.com/retorquere/zotero-open-pdf/releases/latest). Compatible with Zotero 6 and 7.

Zotero allows you to set a default for opening PDFs from Zotero:

* with the system PDF viewer
* with the internal PDF editor

This plugin adds two things:

* adds an option to the right-click menu of items to open PDFs with opposite of what you have configured in Zotero (so open with system PDF viewer if you have configured Zotero to open with the internal editor, and vice versa
* allows you to add extra entries for your own PDF viewers/editor of choice

To add your own, go into the Zotero preferences, tab Advanced, and open the config editor (You will be warned that you can break things. Don't break things). Then right-click and add a new String entry. The key must start with `extensions.zotero.alt-open.{pdf|snapshot|epub}.with.`, add any name you want after it, eg `extensions.zotero.alt-open.pdf.with.skim`, and as the value enter the command line needed to start the app, giving `@pdf` as a parameter where the filename must go. this could eg be

`extensions.zotero.alt-open.pdf.with.preview` = `/usr/bin/open -a Preview @pdf`

which would add an option `Open with preview` to the menu. You can set your own menu label by adding it before the path in brackets:

`extensions.zotero.alt-open.pdf.with.skim` = `[Open with Skim]/usr/bin/open -a Skim @pdf`

If the path to the executable contains spaces, you need to enclose it in quotes, eg to use edge on windows as a PDF viewer:

`extensions.zotero.alt-open.pdf.with.edge` = `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" @pdf`

A more complex example is that you can also open PDF files through extensions in Chrome, such as the Acrobat extension:

`extensions.zotero.alt-open.pdf.with.chrome-acrobat` = `"C:\Program Files\Google\Chrome\Application\chrome.exe" "chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/file:///@pdf"`

"efaidnbmnnnibpcajpcglclefindmkaj" is the ID of the Acrobat extension. To enable the extension to read the file:/// protocol, you need to turn on "Allow access to file URLs" on the "Manage Extensions" page.

**Adding new entries to the menu requires a restart of the plugin.**

In some situations, some programs (such as sioyek) may behave like command-line programs, becoming subprocesses of zotero instead of independent processes when started, causing the program to behave unexpectedly.

On Windows, you can use `start` command to launch it as an independent process.

`extensions.zotero.alt-open.pdf.with.sioyek` = `"C:\Windows\System32\cmd.exe" /c start "" "C:\Users\user\scoop\apps\sioyek\2.0.0\sioyek.exe" --new-window @pdf`

**Pay attention:**

**The plugin does not search the system PATH, you need to enter the full path to the executable. When the path contains spaces or backslashes `\`, you need to wrap the path in quotes " ".**


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

