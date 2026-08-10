// Mock data for Computer & Browser Control. Simulated only — backend ready.
import {
  MousePointerClick, Keyboard, BookOpen, Download, Upload, Globe, Lock, ShoppingCart, MessageSquare, Trash2, Settings, FileEdit, Megaphone, Bot, Monitor, Activity,
} from 'lucide-react';

export const METRICS = [
  { id: 'active', label: 'Active Sessions', value: 7, icon: Activity, grad: 'from-violet-500 to-indigo-500' },
  { id: 'browser', label: 'Browser Sessions', value: 4, icon: Globe, grad: 'from-sky-500 to-cyan-500' },
  { id: 'remote', label: 'Remote Computers', value: 3, icon: Monitor, grad: 'from-emerald-500 to-teal-500' },
  { id: 'tasks', label: 'Running Tasks', value: 12, icon: Bot, grad: 'from-amber-500 to-orange-500' },
];

export const BROWSER_TABS = [
  { id: 't1', title: 'Acme Shop — Checkout', url: 'https://shop.acme.io/checkout', active: true },
  { id: 't2', title: 'Notion — Q3 Brief', url: 'https://notion.so/q3-brief' },
  { id: 't3', title: 'GitHub — PR #482', url: 'https://github.com/palladium/core/pull/482' },
];

export const SECURITY_CONFIRMATIONS = [
  { id: 'purchases', label: 'Purchases', icon: ShoppingCart, on: true },
  { id: 'messages', label: 'Sending messages', icon: MessageSquare, on: true },
  { id: 'delete', label: 'Deleting files', icon: Trash2, on: true },
  { id: 'settings', label: 'Changing account settings', icon: Settings, on: true },
  { id: 'forms', label: 'Submitting forms', icon: FileEdit, on: false },
  { id: 'publish', label: 'Publishing content', icon: Megaphone, on: true },
];

export const REMOTE_COMPUTERS = [
  { id: 'rc1', name: 'dev-vm-01', status: 'Online', os: 'Ubuntu 24.04', agent: 'Devon', session: '1h 24m' },
  { id: 'rc2', name: 'win-finance-02', status: 'Online', os: 'Windows 11', agent: 'Finn', session: '42m' },
  { id: 'rc3', name: 'mac-research-03', status: 'Idle', os: 'macOS 14', agent: 'Aria', session: '3h 11m' },
];

export const REMOTE_STATUS_STYLE = {
  Online: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Idle: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Offline: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const ACTION_FLOW = [
  { icon: Globe, label: 'Opening website', detail: 'shop.acme.io/checkout', grad: 'from-sky-500 to-cyan-500' },
  { icon: MousePointerClick, label: 'Clicking button', detail: '“Place Order”', grad: 'from-violet-500 to-indigo-500' },
  { icon: Keyboard, label: 'Typing text', detail: '4123 **** **** 9921', grad: 'from-amber-500 to-orange-500' },
  { icon: BookOpen, label: 'Reading page', detail: 'parsing checkout form', grad: 'from-emerald-500 to-teal-500' },
  { icon: Download, label: 'Downloading file', detail: 'invoice_08621.pdf', grad: 'from-fuchsia-500 to-pink-500' },
  { icon: Upload, label: 'Uploading file', detail: 'report_q3.xlsx', grad: 'from-rose-500 to-orange-500' },
];

export const MOCK_PAGE = {
  title: 'Acme Shop — Checkout',
  rows: [
    { type: 'hero', text: 'Checkout' },
    { type: 'row', label: 'Subtotal', value: '$128.00' },
    { type: 'row', label: 'Shipping', value: '$6.50' },
    { type: 'row', label: 'Tax', value: '$11.42' },
    { type: 'total', label: 'Total', value: '$145.92' },
    { type: 'button', label: 'Place Order' },
  ],
};