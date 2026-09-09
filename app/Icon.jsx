import {
    Archive, ArrowDownUp, ArrowLeftRight, ArrowUpToLine, Asterisk, BookOpen,
    CalendarDays, ChartBar, Check, Circle, CircleAlert, CircleArrowDown,
    CircleHelp, Clock, Cloud, CloudDownload, Copy, Download, Eye,
    EyeOff, File, Files, Folder, FolderInput, FolderOpen, Globe, Handshake,
    HardDrive, Heart, House, Hourglass, Info, Link, ListFilter, Lock, Mail,
    MessageCircle, Minimize2, Monitor, Network, Pause, Pencil, Play, Plus,
    Power, QrCode, Recycle, RefreshCw, Search, Settings, Share2, ShieldUser,
    Shuffle, Signal, Signpost, Square, SquareMinus, Tag, ThumbsUp, Trash2,
    TriangleAlert, Undo2, Unlink, Unlock, Upload, Wrench, X, Zap
} from 'lucide-preact';

const icons = {
    archive: Archive, 'arrow-down-up': ArrowDownUp,
    'arrow-left-right': ArrowLeftRight, 'arrow-up-to-line': ArrowUpToLine,
    asterisk: Asterisk, book: BookOpen, calendar: CalendarDays,
    chart: ChartBar, check: Check, dot: Circle, 'circle-alert': CircleAlert,
    'circle-arrow-down': CircleArrowDown, help: CircleHelp,
    info: Info, clock: Clock, cloud: Cloud,
    'cloud-download': CloudDownload, copy: Copy, download: Download, eye: Eye,
    'eye-off': EyeOff, file: File, files: Files, folder: Folder,
    'folder-input': FolderInput, 'folder-open': FolderOpen, globe: Globe,
    handshake: Handshake, drive: HardDrive, heart: Heart, house: House,
    hourglass: Hourglass, link: Link, filter: ListFilter, lock: Lock,
    mail: Mail, message: MessageCircle, minimize: Minimize2, monitor: Monitor,
    network: Network, pause: Pause, pencil: Pencil, play: Play, plus: Plus,
    power: Power, qrcode: QrCode, recycle: Recycle, refresh: RefreshCw,
    search: Search, settings: Settings, share: Share2, 'shield-user': ShieldUser,
    shuffle: Shuffle, signal: Signal, signpost: Signpost, stop: Square,
    'square-minus': SquareMinus, tag: Tag, 'triangle-alert': TriangleAlert,
    'thumbs-up': ThumbsUp, trash: Trash2, undo: Undo2, unlink: Unlink,
    unlock: Unlock, upload: Upload, wrench: Wrench, x: X, zap: Zap
};

export function Icon({name, class: className = '', label, ...props}) {
    const Component = icons[name];
    if (!Component) throw new Error(`Unknown Syncshell icon: ${name}`);
    const accessible = label || props['aria-label'];
    return <Component class={`syncshell-icon ${className}`.trim()} size="1em"
        strokeWidth={2.25}
        fill={name === 'dot' ? 'currentColor' : 'none'} focusable="false"
        aria-hidden={accessible ? undefined : 'true'} aria-label={label}
        role={accessible ? 'img' : undefined} {...props} />;
}
