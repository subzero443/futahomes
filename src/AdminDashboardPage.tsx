import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, BadgeCheck, Banknote, Building2, CalendarDays, ChartNoAxesCombined, Check,
  ChevronRight, ClipboardList, CreditCard, FileCheck2, LifeBuoy, Menu, MessageSquareText,
  House, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserRound, Users, UserX, X,
} from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { api, apiFile, naira, prettyDate } from './api';
import type { Account } from './types';
import ProfilePhoto from './ProfilePhoto';
import { notifyToast } from './toast';

type AdminRecord = Record<string, unknown>;
type AdminOverview = {
  counts: Record<string, number>;
  recent: AdminRecord[];
};
type AdminReports = {
  monthly_users: AdminRecord[];
  monthly_properties: AdminRecord[];
  payments: AdminRecord[];
  users: AdminRecord[];
};
type AdminSection = 'overview' | 'users' | 'agents' | 'verification' | 'payments' | 'properties' | 'bookings' | 'reports' | 'reviews' | 'enquiries' | 'support';

const navigation: { id: AdminSection; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Dashboard', icon: ChartNoAxesCombined },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'agents', label: 'Agents', icon: UserRound },
  { id: 'verification', label: 'Agent verification', icon: BadgeCheck },
  { id: 'payments', label: 'Payments & subscriptions', icon: CreditCard },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'reviews', label: 'Reviews', icon: ShieldCheck },
  { id: 'enquiries', label: 'Enquiries', icon: MessageSquareText },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'reports', label: 'Reports', icon: ClipboardList },
];

const sectionInfo: Record<AdminSection, { title: string; subtitle: string; route?: string; key?: string }> = {
  overview: { title: 'Dashboard', subtitle: 'A clear view of activity across FUTA Homes.' },
  users: { title: 'Users', subtitle: 'Review accounts and manage access.', route: 'admin/users', key: 'users' },
  agents: { title: 'Agents', subtitle: 'Review agent accounts, plans, and verification.', route: 'admin/agents', key: 'agents' },
  verification: { title: 'Agent verification', subtitle: 'Review submitted documents and verification requests.', route: 'admin/agents', key: 'agents' },
  payments: { title: 'Payments & subscriptions', subtitle: 'Review Paystack transactions and admin-granted plans.', route: 'admin/payments', key: 'payments' },
  properties: { title: 'Properties', subtitle: 'Moderate listings submitted by agents.', route: 'admin/properties', key: 'properties' },
  bookings: { title: 'Bookings', subtitle: 'Review viewing requests made across the platform.', route: 'admin/bookings', key: 'bookings' },
  reviews: { title: 'Reviews', subtitle: 'Moderate reviews submitted by home seekers.', route: 'admin/reviews', key: 'reviews' },
  enquiries: { title: 'Enquiries', subtitle: 'View messages and leads sent to property agents.', route: 'admin/enquiries', key: 'enquiries' },
  support: { title: 'Support', subtitle: 'Respond to account and listing support requests.', route: 'admin/support', key: 'tickets' },
  reports: { title: 'Reports', subtitle: 'Platform totals and recent activity from live records.' },
};

function adminHref(section = '') {
  return `/auth-loginfutahomes?/admin${section ? `/${section}` : ''}`;
}

function isAdminRecord(value: unknown): value is AdminRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(data: AdminRecord, key: string): AdminRecord[] {
  const rows = data[key];
  return Array.isArray(rows) ? rows.filter(isAdminRecord) : [];
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function displayValue(key: string, value: unknown): string {
  if (key === 'amount_kobo') return naira(Number(value) / 100);
  if (key === 'price') return naira(String(value ?? 0));
  if (key.endsWith('_at') || key === 'created_at' || key === 'paid_at' || key === 'viewing_at') {
    if (!value) return '—';
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-NG');
  }
  if (key === 'is_suspended') return value ? 'Suspended' : 'Active';
  if (key === 'verification_status') return stringValue(value).replace(/_/g, ' ');
  return stringValue(value);
}

function exportCsv(name: string, items: AdminRecord[]) {
  if (!items.length) return;
  const headers = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  const escape = (value: unknown) => `"${stringValue(value).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...items.map((item) => headers.map((header) => escape(item[header])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  notifyToast(`${name.replace(/-/g, ' ')} CSV downloaded.`);
}

async function exportPdf(name: string, title: string, columns: string[], rows: unknown[][], admin: Account | null) {
  if (!rows.length) return;
  if (!admin) throw new Error('Administrator details are unavailable. Sign in again to export this report.');
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape' });
  const generatedAt = new Date();
  pdf.setFillColor(255, 246, 238);
  pdf.rect(0, 0, 297, 32, 'F');
  pdf.setTextColor(185, 75, 21);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('FUTA Homes', 14, 14);
  pdf.setTextColor(48, 37, 31);
  pdf.setFontSize(12);
  pdf.text(title, 14, 23);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Created: ${generatedAt.toLocaleString('en-NG')}`, 14, 38);
  pdf.text(`Stamped by FUTA Homes Admin: ${admin.name} (${admin.email})`, 14, 43);
  autoTable(pdf, {
    head: [columns],
    body: rows.map((row) => row.map(stringValue)),
    startY: 49,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [237, 112, 40], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 247, 241] },
    didDrawPage: () => {
      pdf.setFontSize(8);
      pdf.setTextColor(130, 110, 97);
      pdf.text(`FUTA Homes · Admin report · ${generatedAt.toLocaleString('en-NG')}`, 14, pdf.internal.pageSize.height - 8);
    },
  });
  pdf.save(`${name}-${new Date().toISOString().slice(0, 10)}.pdf`);
  notifyToast(`${title} PDF downloaded.`);
}

function DataTable({ rows, columns, actions, showRank = false }: {
  rows: AdminRecord[];
  columns: { key: string; label: string }[];
  actions?: (row: AdminRecord) => ReactNode;
  showRank?: boolean;
}) {
  if (!rows.length) return <div className="admin-empty">Nothing to show here yet.</div>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr>{showRank && <th>#</th>}{columns.map((column) => <th key={column.key}>{column.label}</th>)}{actions && <th>Action</th>}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={stringValue(row.id) === '—' ? index : String(row.id)}>
              {showRank && <td>{index + 1}</td>}
              {columns.map((column) => <td key={column.key}>{displayValue(column.key, row[column.key])}</td>)}
              {actions && <td><div className="admin-row-actions">{actions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDirectory({ rows, busyAction, onToggle, onRemove }: {
  rows: AdminRecord[];
  busyAction: string;
  onToggle: (row: AdminRecord) => void;
  onRemove: (row: AdminRecord) => void;
}) {
  const activeCount = rows.filter((row) => !row.is_suspended).length;
  const suspendedCount = rows.length - activeCount;
  const adminCount = rows.filter((row) => row.role === 'admin').length;
  const stats = [
    { label: 'All accounts', count: rows.length, icon: Users, tone: 'orange' },
    { label: 'Active', count: activeCount, icon: UserCheck, tone: 'green' },
    { label: 'Suspended', count: suspendedCount, icon: UserX, tone: 'red' },
    { label: 'Administrators', count: adminCount, icon: ShieldCheck, tone: 'purple' },
  ];

  return (
    <div className="user-directory">
      <div className="user-directory-stats">
        {stats.map(({ label, count, icon: Icon, tone }) => (
          <article className={`user-directory-stat ${tone}`} key={label}>
            <span className="user-directory-stat-icon"><Icon size={18} /></span>
            <span><small>{label}</small><strong>{count}</strong></span>
          </article>
        ))}
      </div>
      <section className="admin-panel user-directory-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Account directory</h2>
            <p>Review contact details and manage account access.</p>
          </div>
          <span className="user-directory-count">{rows.length} {rows.length === 1 ? 'account' : 'accounts'}</span>
        </div>
        {rows.length ? (
          <div className="user-directory-table-wrap">
            <table className="user-directory-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isAdmin = row.role === 'admin';
                  const isSuspended = Boolean(row.is_suspended);
                  const actionBusy = busyAction === `user-${row.id}` || busyAction === `remove-user-${row.id}`;
                  return (
                    <tr className={isSuspended ? 'is-suspended' : ''} key={String(row.id)}>
                      <td data-label="Name"><span className="user-table-name">{stringValue(row.name)}</span></td>
                      <td data-label="Email" className="user-table-email">{stringValue(row.email)}</td>
                      <td data-label="Phone">{stringValue(row.phone)}</td>
                      <td data-label="Role"><span className={`user-role-badge ${isAdmin ? 'admin' : row.role === 'agent' ? 'agent' : 'user'}`}>{stringValue(row.role)}</span></td>
                      <td data-label="Status"><span className={`user-status-badge ${isSuspended ? 'suspended' : 'active'}`}><span />{isSuspended ? 'Suspended' : 'Active'}</span></td>
                      <td data-label="Joined">{prettyDate(String(row.created_at ?? ''))}</td>
                      <td data-label="Actions">
                        {!isAdmin ? (
                          <div className="user-table-actions">
                            <button
                              type="button"
                              className={`user-account-action${isSuspended ? ' restore' : ''}`}
                              disabled={actionBusy}
                              onClick={() => onToggle(row)}
                            >
                              {busyAction === `user-${row.id}` ? 'Updating…' : isSuspended ? 'Restore' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              className="user-account-action remove"
                              disabled={actionBusy}
                              onClick={() => onRemove(row)}
                            >
                              {busyAction === `remove-user-${row.id}` ? 'Removing…' : <><Trash2 size={14} /> Remove</>}
                            </button>
                          </div>
                        ) : <span className="user-admin-protected"><ShieldCheck size={14} /> Protected</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="admin-empty">No user accounts match your search.</div>}
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone = '' }: { label: string; value: number | string; icon: typeof Activity; tone?: string }) {
  return (
    <article className={`admin-metric ${tone}`}>
      <span className="admin-metric-icon"><Icon size={19} /></span>
      <span className="admin-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>All time</small>
    </article>
  );
}

export default function AdminDashboardPage({ user, sessionReady, onSignOut }: { user: Account | null; sessionReady: boolean; onSignOut: () => void }) {
  const location = useLocation();
  const [rows, setRows] = useState<AdminRecord[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<AdminReports>({ monthly_users: [], monthly_properties: [], payments: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyAction, setBusyAction] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (error) {
      notifyToast(error, 'error');
      setError('');
    } else if (notice) {
      notifyToast(notice);
      setNotice('');
    }
  }, [error, notice]);

  const adminRoute = location.pathname === '/auth-loginfutahomes'
    ? location.search.slice(1)
    : location.pathname;
  const sectionName = adminRoute.replace(/^\/admin\/?/, '').split('/')[0] || 'overview';
  const section: AdminSection = navigation.some((item) => item.id === sectionName) ? sectionName as AdminSection : 'overview';
  const info = sectionInfo[section];

  useEffect(() => {
    if (!sessionReady || user?.role !== 'admin') return;
    let active = true;
    setLoading(true);
    setError('');
    setNotice('');

    const load = async () => {
      try {
        if (section === 'overview') {
          const result = await api<AdminOverview>('admin/overview');
          if (active) setOverview(result);
        } else if (section === 'reports') {
          const [overviewResult, reportResult] = await Promise.all([
            api<AdminOverview>('admin/overview'),
            api<AdminReports>('admin/reports/data'),
          ]);
          if (active) {
            setOverview(overviewResult);
            setReports({
              monthly_users: reportResult.monthly_users.filter(isAdminRecord),
              monthly_properties: reportResult.monthly_properties.filter(isAdminRecord),
              payments: reportResult.payments.filter(isAdminRecord),
              users: reportResult.users.filter(isAdminRecord),
            });
          }
        } else if (info.route && info.key) {
          const result = await api<AdminRecord>(info.route);
          if (active) setRows(recordsFrom(result, info.key));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this admin view.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [info.key, info.route, section, sessionReady, user?.role, refreshKey]);

  const visibleRows = useMemo(() => {
    const source = section === 'verification'
      ? rows.filter((row) => row.verification_status === 'pending')
      : rows;
    const term = query.trim().toLowerCase();
    if (!term) return source;
    return source.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term)));
  }, [query, rows, section]);

  if (!sessionReady) return <main className="loading page" role="status">Checking administrator access…</main>;
  if (!user) return <Navigate to="/auth-loginfutahomes?/admin" replace state={{ from: location }} />;
  if (user.role !== 'admin') return <main className="site-container page section"><div className="alert error" role="alert">This area is for administrators only.</div><Link className="btn primary" to="/">Return to homes</Link></main>;

  async function performAction(label: string, route: string, data: AdminRecord, successMessage = 'Update saved.') {
    setBusyAction(label);
    setError('');
    setNotice('');
    try {
      const result = await api<{ cleanup_warning?: boolean }>(route, { data });
      setNotice(result.cleanup_warning
        ? 'Account removed, but some uploaded files could not be cleaned up. Check the server logs.'
        : successMessage);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this update.');
    } finally {
      setBusyAction('');
    }
  }

  function removeUser(row: AdminRecord) {
    const accountType = row.role === 'agent' ? 'agent' : 'user';
    const confirmed = window.confirm(
      `Permanently remove ${accountType} account "${stringValue(row.name)}"? This also deletes its related account data${row.role === 'agent' ? ', properties, and property media records' : ''}. This cannot be undone.`,
    );
    if (!confirmed) return;
    void performAction(
      `remove-user-${row.id}`,
      'admin/users/delete',
      { id: row.id },
      'Account and related data removed.',
    );
  }

  async function recheckPayment(id: unknown) {
    setBusyAction(`payment-${String(id)}`);
    setError('');
    setNotice('');
    try {
      const result = await api<{ paid: boolean }>('admin/payment/recheck', { data: { id } });
      setNotice(result.paid ? 'Paystack confirmed the payment and the subscription is active.' : 'Paystack has not confirmed this payment yet.');
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not recheck this payment.');
    } finally {
      setBusyAction('');
    }
  }

  async function viewVerificationDocument(id: unknown) {
    const documentTab = window.open('about:blank', '_blank');
    if (!documentTab) {
      setError('Allow pop-ups to open the verification document.');
      return;
    }
    documentTab.opener = null;
    documentTab.document.title = 'Loading verification document';
    documentTab.document.body.textContent = 'Loading verification document…';
    setError('');

    try {
      const file = await apiFile('admin/agents/document', { id: String(id) }, 'admin');
      const url = URL.createObjectURL(file);
      documentTab.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      documentTab.close();
      setError(cause instanceof Error ? cause.message : 'Could not open the verification document.');
    }
  }

  function moderateProperty(row: AdminRecord, status: 'approved' | 'rejected') {
    const response = status === 'rejected' ? window.prompt('Optional note for the agent', '') : '';
    if (response === null) return;
    const note = response;
    void performAction(`property-${String(row.id)}`, 'admin/properties/status', { id: row.id, status, note });
  }

  function downloadPdf(name: string, title: string, columns: string[], data: unknown[][]) {
    void exportPdf(name, title, columns, data, user).catch((cause: unknown) => {
      notifyToast(cause instanceof Error ? cause.message : 'Could not create the PDF report.', 'error');
    });
  }

  function renderSection() {
    if (section === 'overview') {
      const counts = overview?.counts ?? {};
      const stats = [
        { label: 'Total users', value: counts.users ?? 0, icon: Users },
        { label: 'Properties', value: counts.properties ?? 0, icon: Building2 },
        { label: 'Agents', value: counts.agents ?? 0, icon: UserRound },
        { label: 'Bookings', value: counts.bookings ?? 0, icon: CalendarDays },
        { label: 'Pending properties', value: counts.pending_properties ?? 0, icon: Activity },
        { label: 'Pending verification', value: counts.pending_agents ?? 0, icon: FileCheck2 },
        { label: 'Paid payments', value: counts.paid_payments ?? 0, icon: Banknote },
        { label: 'Open support tickets', value: counts.tickets ?? 0, icon: LifeBuoy },
      ];
      return (
        <>
          <div className="admin-metrics">{stats.map((item, index) => <MetricCard key={item.label} {...item} tone={index < 4 ? 'highlight' : ''} />)}</div>
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Recent property activity</h2><p>Latest listings submitted to the platform.</p></div><Link to={adminHref('properties')} className="admin-inline-link">All properties <ChevronRight size={16} /></Link></div>
            <DataTable rows={overview?.recent ?? []} columns={[{ key: 'title', label: 'Property' }, { key: 'agent_name', label: 'Agent' }, { key: 'moderation_status', label: 'Status' }, { key: 'created_at', label: 'Submitted' }]} />
          </section>
          <div className="admin-quick-links">{navigation.slice(1, 7).map(({ id, label, icon: Icon }) => <Link key={id} to={adminHref(id)}><Icon size={18} /><span>{label}</span><ChevronRight size={16} /></Link>)}</div>
        </>
      );
    }

    if (section === 'reports') {
      const counts = overview?.counts ?? {};
      const usersByMonth = new Map(reports.monthly_users.map((item) => [String(item.month), Number(item.total)]));
      const propertiesByMonth = new Map(reports.monthly_properties.map((item) => [String(item.month), Number(item.total)]));
      const monthlyRows = Array.from(new Set([...usersByMonth.keys(), ...propertiesByMonth.keys()]))
        .sort()
        .map((month) => ({
          month,
          users: usersByMonth.get(month) ?? 0,
          properties: propertiesByMonth.get(month) ?? 0,
        }));
      const paymentColumns = [
        { key: 'reference', label: 'Reference' },
        { key: 'agent_name', label: 'Agent' },
        { key: 'agent_email', label: 'Email' },
        { key: 'plan', label: 'Plan' },
        { key: 'amount_kobo', label: 'Amount' },
        { key: 'provider', label: 'Provider' },
        { key: 'status', label: 'Status' },
        { key: 'created_at', label: 'Created' },
        { key: 'paid_at', label: 'Paid at' },
      ];
      const paymentExportRows = reports.payments.map((item) => ({
        reference: item.reference,
        agent_name: item.agent_name,
        agent_email: item.agent_email,
        plan: item.plan,
        amount: `NGN ${(Number(item.amount_kobo) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`,
        provider: item.provider,
        status: item.status,
        created_at: item.created_at,
        paid_at: item.paid_at,
      }));
      const userColumns = [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'phone', label: 'Phone' },
        { key: 'created_at', label: 'Date created' },
      ];
      return (
        <>
          <div className="admin-report-toolbar"><p>Monthly totals cover the latest 12 months. User and payment exports include up to 5,000 recent records.</p></div>
          <div className="admin-metrics admin-report-metrics">
            <MetricCard label="Registered users" value={counts.users ?? 0} icon={Users} />
            <MetricCard label="Non-pending properties" value={Number(counts.properties ?? 0) - Number(counts.pending_properties ?? 0)} icon={Building2} />
            <MetricCard label="Paid transactions" value={counts.paid_payments ?? 0} icon={CreditCard} />
            <MetricCard label="Viewing requests" value={counts.bookings ?? 0} icon={CalendarDays} />
          </div>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>User accounts</h2><p>Account details and the date each user registered.</p></div>
              <div className="admin-report-actions">
                <button className="admin-action" disabled={!reports.users.length} onClick={() => exportCsv('futa-homes-user-accounts', reports.users)}>Download CSV</button>
                <button className="admin-action" disabled={!reports.users.length} onClick={() => downloadPdf(
                  'futa-homes-user-accounts',
                  'User accounts',
                  userColumns.map((column) => column.label),
                  reports.users.map((item) => userColumns.map((column) => displayValue(column.key, item[column.key]))),
                )}>Download PDF</button>
              </div>
            </div>
            <div className="admin-report-toolbar"><p>Exports include name, email, role, phone, and registration date for up to 5,000 recent users. Passwords are never included.</p></div>
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Monthly users and properties</h2><p>New accounts and property listings by month.</p></div>
              <div className="admin-report-actions">
                <button className="admin-action" disabled={!monthlyRows.length} onClick={() => exportCsv('futa-homes-monthly-growth', monthlyRows)}>Download CSV</button>
                <button className="admin-action" disabled={!monthlyRows.length} onClick={() => downloadPdf('futa-homes-monthly-growth', 'Monthly users and properties', ['Month', 'New users', 'New properties'], monthlyRows.map((item) => [item.month, item.users, item.properties]))}>Download PDF</button>
              </div>
            </div>
            <DataTable rows={monthlyRows} columns={[{ key: 'month', label: 'Month' }, { key: 'users', label: 'New users' }, { key: 'properties', label: 'New properties' }]} />
          </section>
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Payment transactions</h2><p>Most recent transactions, including pending and failed payments.</p></div>
              <div className="admin-report-actions">
                <button className="admin-action" disabled={!paymentExportRows.length} onClick={() => exportCsv('futa-homes-payment-transactions', paymentExportRows)}>Download CSV</button>
                <button className="admin-action" disabled={!reports.payments.length} onClick={() => downloadPdf(
                  'futa-homes-payment-transactions',
                  'Payment transactions',
                  paymentColumns.map((column) => column.label),
                  reports.payments.map((item) => paymentColumns.map((column) => column.key === 'amount_kobo'
                    ? `NGN ${(Number(item.amount_kobo) / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
                    : displayValue(column.key, item[column.key]))),
                )}>Download PDF</button>
              </div>
            </div>
            <DataTable rows={reports.payments} columns={paymentColumns} />
          </section>
        </>
      );
    }

    if (section === 'users') return (
      <UserDirectory
        rows={visibleRows}
        busyAction={busyAction}
        onToggle={(row) => void performAction(`user-${row.id}`, 'admin/users/status', { id: row.id, suspended: !row.is_suspended })}
        onRemove={removeUser}
      />
    );

    if (section === 'agents' || section === 'verification') return (
      <section className="admin-panel">
        {section === 'verification' && <div className="admin-panel-heading"><div><h2>Pending applications</h2><p>Open documents before approving or rejecting an agent.</p></div></div>}
        <DataTable rows={visibleRows} columns={[{ key: 'name', label: 'Agent' }, { key: 'email', label: 'Email' }, { key: 'business_name', label: 'Business' }, { key: 'verification_status', label: 'Verification' }, ...(section === 'agents' ? [{ key: 'plan', label: 'Plan' }, { key: 'plan_expires_at', label: 'Plan expiry' }] : [])]} actions={(row) => (
          <>
            {row.verification_document && <button className="admin-action" onClick={() => void viewVerificationDocument(row.id)}>View document</button>}
            <button className="admin-action" disabled={busyAction === `verify-${row.id}`} onClick={() => void performAction(`verify-${row.id}`, 'admin/agents/status', { id: row.id, status: 'approved', note: '' })}>Approve</button>
            <button className="admin-action warning" disabled={busyAction === `reject-${row.id}`} onClick={() => {
              const reason = window.prompt('Reason for rejection', '');
              if (reason !== null) void performAction(`reject-${row.id}`, 'admin/agents/status', { id: row.id, status: 'rejected', note: reason || 'Please contact support for details.' });
            }}>Reject</button>
            {section === 'agents' && <select aria-label={`Set plan for ${stringValue(row.name)}`} defaultValue={String(row.plan ?? 'free')} onChange={(event) => void performAction(`plan-${row.id}`, 'admin/plan/grant', { id: row.id, plan: event.target.value })}><option value="free">Free plan</option><option value="pro">Pro plan</option><option value="premium">Premium plan</option></select>}
          </>
        )} />
      </section>
    );

    if (section === 'properties') return <section className="admin-panel"><DataTable rows={visibleRows} columns={[{ key: 'title', label: 'Property' }, { key: 'agent_name', label: 'Agent' }, { key: 'location', label: 'Location' }, { key: 'price', label: 'Price' }, { key: 'moderation_status', label: 'Status' }, { key: 'created_at', label: 'Created' }]} actions={(row) => <><button className="admin-action" disabled={busyAction === `property-${row.id}`} onClick={() => moderateProperty(row, 'approved')}>Approve</button><button className="admin-action warning" disabled={busyAction === `property-${row.id}`} onClick={() => moderateProperty(row, 'rejected')}>Reject</button></>} /></section>;

    if (section === 'payments') return (
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Payments & subscriptions</h2><p>Paystack payments and admin-granted demo subscriptions.</p></div></div>
        <DataTable rows={visibleRows} columns={[{ key: 'agent_name', label: 'Agent' }, { key: 'agent_email', label: 'Email' }, { key: 'reference', label: 'Reference' }, { key: 'amount_kobo', label: 'Amount' }, { key: 'provider', label: 'Paid through' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Date' }, { key: 'paid_at', label: 'Paid at' }]} actions={(row) => row.provider === 'paystack' && row.status === 'pending' ? <button className="admin-action" disabled={busyAction === `payment-${row.id}`} onClick={() => void recheckPayment(row.id)}>Recheck</button> : <span className="admin-muted-action">—</span>} />
      </section>
    );

    if (section === 'bookings') return <section className="admin-panel"><DataTable rows={visibleRows} columns={[{ key: 'title', label: 'Property' }, { key: 'user_name', label: 'Customer' }, { key: 'agent_name', label: 'Agent' }, { key: 'viewing_at', label: 'Viewing time' }, { key: 'status', label: 'Status' }, { key: 'phone', label: 'Phone' }, { key: 'created_at', label: 'Requested' }]} /></section>;
    if (section === 'enquiries') return <section className="admin-panel"><DataTable rows={visibleRows} columns={[{ key: 'reference', label: 'Reference' }, { key: 'title', label: 'Property' }, { key: 'user_name', label: 'Customer' }, { key: 'agent_name', label: 'Agent' }, { key: 'message', label: 'Message' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Date' }]} /></section>;
    if (section === 'reviews') return <section className="admin-panel"><DataTable rows={visibleRows} columns={[{ key: 'user_name', label: 'Customer' }, { key: 'agent_name', label: 'Agent' }, { key: 'rating', label: 'Rating' }, { key: 'comment', label: 'Review' }, { key: 'status', label: 'Status' }, { key: 'created_at', label: 'Date' }]} actions={(row) => <><button className="admin-action" disabled={busyAction === `review-${row.id}`} onClick={() => void performAction(`review-${row.id}`, 'admin/reviews/status', { id: row.id, status: 'approved' })}>Approve</button><button className="admin-action warning" disabled={busyAction === `review-${row.id}`} onClick={() => void performAction(`review-${row.id}`, 'admin/reviews/status', { id: row.id, status: 'rejected' })}>Reject</button></>} /></section>;
    if (section === 'support') return (
      <div className="admin-ticket-list">
        {visibleRows.length ? visibleRows.map((ticket) => <article className="admin-ticket" key={String(ticket.id)}>
          <div className="admin-ticket-heading"><div><span className="tag">{stringValue(ticket.status)}</span><h2>{stringValue(ticket.subject)}</h2><p>{stringValue(ticket.user_name)} · {stringValue(ticket.user_email)} · {prettyDate(String(ticket.created_at ?? ''))}</p></div><span className="admin-ticket-id">#{stringValue(ticket.id)}</span></div>
          <p className="admin-ticket-message">{stringValue(ticket.message)}</p>
          {ticket.admin_reply !== null && ticket.admin_reply !== undefined && ticket.admin_reply !== '' && <blockquote>{stringValue(ticket.admin_reply)}</blockquote>}
          <form className="admin-reply-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const reply = String(new FormData(event.currentTarget).get('reply') ?? '').trim();
            if (reply) void performAction(`ticket-${ticket.id}`, 'admin/support/reply', { id: ticket.id, reply });
          }}>
            <textarea name="reply" aria-label={`Reply to ticket ${stringValue(ticket.id)}`} placeholder="Write a helpful reply…" required minLength={2} />
            <button className="btn primary btn-sm" type="submit" disabled={busyAction === `ticket-${ticket.id}`}>Send reply</button>
          </form>
        </article>) : <div className="admin-empty">No support tickets found.</div>}
      </div>
    );

    return null;
  }

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar${mobileMenuOpen ? ' open' : ''}`}>
        <div className="admin-sidebar-brand"><span className="admin-brand-icon"><House size={20} /></span><span><strong>FUTA</strong> HOMES</span><button aria-label="Close admin menu" className="admin-close-menu" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button></div>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav className="admin-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <Link key={id} to={id === 'overview' ? adminHref() : adminHref(id)} className={section === id ? 'active' : ''} onClick={() => setMobileMenuOpen(false)}>
              <Icon size={18} /><span>{label}</span>{id === 'verification' && Number(overview?.counts.pending_agents) > 0 && <em>{overview?.counts.pending_agents}</em>}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link className="admin-account-link" to={adminHref('profileacc')}>
            <ProfilePhoto name={user.name} photo={user.avatar} />
            <span><strong>{user.name}</strong><small>Administrator</small></span>
          </Link>
          <button title="Sign out" aria-label="Sign out" onClick={onSignOut}><ChevronRight size={17} /></button>
        </div>
      </aside>
      {mobileMenuOpen && <button className="admin-menu-backdrop" aria-label="Close admin menu" onClick={() => setMobileMenuOpen(false)} />}
      <section className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-toggle" aria-label="Open admin menu" onClick={() => setMobileMenuOpen(true)}><Menu size={21} /></button>
          <div className="admin-breadcrumb">FUTA Homes <ChevronRight size={14} /> <span>{info.title}</span></div>
          <div className="admin-topbar-actions"><span className="admin-current-date">{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><button className="admin-icon-button" aria-label="Refresh data" onClick={() => setRefreshKey((current) => current + 1)}><RefreshCw size={17} /></button><Link className="admin-view-site" to="/">View website</Link></div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading"><div><p className="admin-kicker">FUTA HOMES ADMIN</p><h1>{info.title}</h1><p>{info.subtitle}</p></div>
            {section !== 'overview' && section !== 'reports' && <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${info.title.toLowerCase()}…`} aria-label={`Search ${info.title}`} /><span>{visibleRows.length}</span></label>}
          </div>
          {loading ? <div className="admin-loading"><RefreshCw size={20} /> Loading live data…</div> : renderSection()}
        </div>
      </section>
    </main>
  );
}
