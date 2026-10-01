// explanations retained from the accepted Syncshell UI
import { DefinitionRow } from '../../DefinitionRow.jsx';

export const folderFieldHelp = {
  'Global/local State': {
    icon: 'dot',
    help:
      'Shows the global totals alongside the folder status. Separate rows show global and local ' +
      'contents when details are needed; ignore patterns can make the totals differ even when up ' +
      'to date.',
  },
  'Global State': {
    icon: 'globe',
    help:
      'The latest known versions of files across the sharing devices. These totals describe the ' +
      'contents this folder would have when fully synchronized, before local ignore rules.',
  },
  'Local State': {
    icon: 'house',
    help:
      'The files and data Syncthing currently tracks in this folder on this device. These totals ' +
      'can differ from the global contents during synchronization or because of ignore patterns.',
  },
  'Altered by ignoring deletes.': {
    icon: 'help',
    help:
      'Deletion requests from other devices are ignored, so files deleted elsewhere can remain in ' +
      'this folder.',
  },
  'Last Scan': {
    icon: 'clock',
    help:
      'When Syncthing last scanned this folder for local changes. This is a scan timestamp, not ' +
      'the time of the last file transfer.',
  },
  Error: {
    icon: 'triangle-alert',
    help:
      'The problem Syncthing reports for this folder. Hover over the message to read the full ' +
      'details.',
  },
  'Failed Items': {
    icon: 'circle-alert',
    help:
      'Items Syncthing could not synchronize. Click the count to see the affected paths and their ' +
      'individual errors.',
  },
  'Locally Changed Items': {
    icon: 'circle-alert',
    help:
      'Local changes in a receive-only folder that are not sent to other devices, or unexpected ' +
      'local items in a receive-encrypted folder. Click the value to inspect them.',
  },
  'Scan Time Remaining': {
    icon: 'hourglass',
    help:
      'Estimated time left for the current scan, calculated from the remaining data and current ' +
      'scanning rate. This estimates scanning, not synchronization.',
  },
  'Latest Change': {
    icon: 'arrow-left-right',
    help:
      'The most recent file synchronized here, as reported by Syncthing. Hover over the filename ' +
      'for its full path, update or deletion, and timestamp.',
  },
  Rescans: {
    icon: 'refresh',
    help:
      'Detects local changes through periodic full scans and filesystem watching. The clock shows ' +
      'the scan interval; the eye shows whether watching is enabled.',
  },
  'File Versioning': {
    icon: 'files',
    help:
      'Keeps older copies when changes from another device replace or delete files here. It does ' +
      'not archive changes you make locally; retention depends on the selected versioning method.',
  },
  'Ignore Permissions': {
    icon: 'square-minus',
    help:
      'File permission changes are not synchronized for this folder. File contents still ' +
      'synchronize normally.',
  },
  'Folder Path': {
    icon: 'folder-open',
    help:
      'Full path to your Syncthing folder on the file system of this device. Hover over the value ' +
      'to see the complete path.',
  },
  'Folder Type': {
    icon: 'folder',
    help:
      'Controls how changes travel: Send and Receive exchanges changes both ways; Send Only ' +
      'publishes local changes; Receive Only accepts remote changes without publishing local ' +
      'edits; Receive Encrypted stores protected data without decrypting it.',
  },
  'Folder ID': {
    icon: 'info',
    help:
      'Identifies this shared folder across devices. Every device sharing it must use exactly the ' +
      'same ID, including letter case.',
  },
  'Block Indexing': {
    icon: 'book',
    help:
      'Keeps an index of data blocks so Syncthing can reuse existing content from other files, ' +
      'including other folders. Disabling it saves database space but can increase transfer ' +
      'bandwidth.',
  },
  'File Pull Order': {
    icon: 'arrow-down-up',
    help:
      'Sets the download priority for files needed from other devices. Ordering applies only to ' +
      'files already discovered during scanning.',
  },
};

export function FolderDefinitionRow({ label, ...props }) {
  return (
    <DefinitionRow
      definition={folderFieldHelp[label]}
      label={label}
      {...props}
    />
  );
}
