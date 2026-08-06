import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  AutoComplete,
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Input,
  Layout,
  Menu,
  Popover,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  ClockCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GoldOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PhoneOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UsergroupAddOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { SessionUser } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { ROLE_META, scopedLoanType } from '../auth/rbac';
import type { ModuleKey } from '../auth/rbac';
import { usePermissionStatus, usePermissionStore } from '../auth/permissionStore';
import { DensityToggle, useDensity } from '../components/DataTable';
import { PageLoader } from '../components/StateViews';
import { RoleTag, roleTone } from '../components/StatusTag';
import { BRAND } from '../theme/tokens';
import { LogoMark } from '../components/Logo';
import { fmtTimeAgo, initials } from '../utils/format';
import './AppLayout.css';

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

/* Notification icons take their colour from the tone class, not a hex prop. */
const NOTIF_ICON: Record<string, { icon: React.ReactNode; tone: string }> = {
  application: { icon: <FileTextOutlined />, tone: 'info' },
  credit: { icon: <SafetyCertificateOutlined />, tone: 'warning' },
  finance: { icon: <BankOutlined />, tone: 'success' },
  collection: { icon: <ExclamationCircleOutlined />, tone: 'danger' },
  system: { icon: <ThunderboltOutlined />, tone: 'neutral' },
};

const AppLayout: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const status = usePermissionStatus();
  const load = usePermissionStore((s) => s.load);

  /* Effective permissions are fetched once per session and drive the whole shell.
     The auth store is persisted, so this also runs on a hard refresh — the session
     survives but the grants do not, and rendering a nav before they arrive would
     flash an empty sidebar (or worse, the wrong one). */
  useEffect(() => {
    if (user && status === 'idle') void load(user.role);
  }, [user, status, load]);

  if (!user) return <Navigate to="/login" replace />;
  if (status === 'idle' || status === 'loading') return <PageLoader />;

  return <LayoutInner user={user} />;
};

const LayoutInner: React.FC<{ user: SessionUser }> = ({ user }) => {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const logout = useAuthStore((s) => s.logout);
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const notifications = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const [density, setDensity] = useDensity();

  /* Below lg the sider becomes an overlay drawer rather than overflowing the
     page — the previous layout simply broke below ~1200px. */
  const isMobile = !screens.lg;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const meta = ROLE_META[user.role];
  const scope = scopedLoanType(user.role);
  /* Family, not the literal role string: the API also issues SUPER_ADMIN, which
     is an admin. Comparing to 'ADMIN' hid every report sub-item from them. */
  const isAdmin = meta.family === 'ADMIN';
  /* Navigation is built from the user's REAL grants (GET /permissions/me), not
     from a role table compiled into the bundle. */
  const grants = usePermissionStore((st) => st.grants);
  const permissionError = usePermissionStore((st) => st.error);
  const can = (m: ModuleKey): boolean => (grants[m]?.length ?? 0) > 0;

  /* Close the mobile drawer whenever we navigate. */
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // ── sidebar items, filtered by role ────────────────────────────────────────
  const menuItems = useMemo(() => {
    const items: MenuProps['items'] = [];
    items.push({ key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard' });

    if (can('applications')) {
      items.push({
        key: 'g-applications',
        icon: <FileTextOutlined />,
        label: 'Applications',
        children: [
          { key: '/applications', label: 'All Applications' },
          { key: '/applications/submitted', label: 'Submitted' },
          { key: '/applications/credit-pending', label: 'Credit Pending' },
          { key: '/applications/finance-pending', label: 'Finance Pending' },
          { key: '/applications/disbursed', label: 'Disbursed' },
        ],
      });
    }
    if (can('customers')) {
      items.push({ key: '/customers', icon: <IdcardOutlined />, label: 'Customers' });
    }
    if (can('appraisals')) {
      items.push({ key: '/appraisals', icon: <GoldOutlined />, label: 'Appraisals' });
    }
    if (can('credit')) {
      items.push({
        key: 'g-credit',
        icon: <SafetyCertificateOutlined />,
        label: 'Credit',
        children: [
          { key: '/credit/pending', label: 'Pending Reviews' },
          { key: '/credit/approved', label: 'Approved' },
          { key: '/credit/rejected', label: 'Rejected' },
          { key: '/credit/returned', label: 'Returned' },
        ],
      });
    }
    if (can('finance')) {
      items.push({
        key: 'g-finance',
        icon: <BankOutlined />,
        label: 'Finance',
        children: [
          { key: '/finance/pending', label: 'Pending' },
          { key: '/finance/emandates', label: 'E-Mandates' },
          { key: '/finance/disbursed', label: 'Disbursed' },
        ],
      });
    }
    if (can('lms')) {
      items.push({
        key: 'g-lms',
        icon: <WalletOutlined />,
        label: 'Loan Management',
        children: [
          { key: '/lms/accounts', label: 'Loan Accounts' },
          { key: '/lms/emi-schedule', label: 'EMI Schedule' },
          { key: '/lms/repayments', label: 'Repayments' },
          { key: '/lms/nach', label: 'Recurring Debits' },
          { key: '/lms/charges', label: 'Charges' },
          { key: '/lms/documents', label: 'Document Repository' },
        ],
      });
    }
    if (can('collections')) {
      items.push({
        key: 'g-collections',
        icon: <PhoneOutlined />,
        label: 'Collections',
        children: [
          { key: '/collections/due-today', label: 'Due Today' },
          { key: '/collections/overdue', label: 'Overdue' },
          { key: '/collections/npa', label: 'NPA' },
          { key: '/collections/recovery', label: 'Recovery' },
        ],
      });
    }
    if (can('reports')) {
      const fam = meta.family;
      const children = [
        { key: '/reports/los', label: 'LOS Reports', show: isAdmin },
        {
          key: '/reports/credit',
          label: 'Credit Reports',
          show: isAdmin || fam === 'CREDIT',
        },
        {
          key: '/reports/finance',
          label: 'Finance Reports',
          show: isAdmin || fam === 'FINANCE',
        },
        { key: '/reports/collections', label: 'Collection Reports', show: isAdmin },
        {
          key: '/reports/reconciliation',
          label: 'Reconciliation',
          show: isAdmin || fam === 'FINANCE',
        },
      ]
        .filter((c) => c.show)
        .map(({ key, label }) => ({ key, label }));
      items.push({ key: 'g-reports', icon: <BarChartOutlined />, label: 'Reports', children });
    }

    /* Administration — visually separated, because it is a different mode of
       work from the lending pipeline above it. */
    const admin: MenuProps['items'] = [];
    if (can('agents'))
      admin.push({ key: '/agents', icon: <UsergroupAddOutlined />, label: 'Agents' });
    if (can('branches'))
      admin.push({ key: '/branches', icon: <ApartmentOutlined />, label: 'Branches' });
    if (can('approvals'))
      admin.push({ key: '/approvals', icon: <AuditOutlined />, label: 'Approvals' });
    if (can('users'))
      admin.push({ key: '/users', icon: <TeamOutlined />, label: 'User Management' });
    if (can('permissions'))
      admin.push({
        key: '/permissions',
        icon: <SafetyCertificateOutlined />,
        label: 'Roles & Permissions',
      });
    if (can('audit')) admin.push({ key: '/audit', icon: <AuditOutlined />, label: 'Audit Logs' });
    if (can('settings'))
      admin.push({ key: '/settings', icon: <SettingOutlined />, label: 'Settings' });

    if (admin.length) {
      items.push({ type: 'divider' });
      items.push({ key: 'grp-admin', type: 'group', label: 'Administration', children: admin });
    }
    return items;
  }, [grants, isAdmin, meta.family]);

  // ── selected key: longest matching route ───────────────────────────────────
  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/applications/view')) return '/applications';

    const keys: string[] = [];
    const collect = (items: MenuProps['items']): void => {
      items?.forEach((it) => {
        if (!it) return;
        const node = it as { key?: React.Key; children?: MenuProps['items'] };
        if (node.key && String(node.key).startsWith('/')) keys.push(String(node.key));
        if (node.children) collect(node.children);
      });
    };
    collect(menuItems);
    const match = keys
      .filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return match ?? location.pathname;
  }, [location.pathname, menuItems]);

  const groupOf = (key: string): string =>
    key.startsWith('/applications')
      ? 'g-applications'
      : key.startsWith('/credit')
        ? 'g-credit'
        : key.startsWith('/finance')
          ? 'g-finance'
          : key.startsWith('/lms')
            ? 'g-lms'
            : key.startsWith('/collections')
              ? 'g-collections'
              : key.startsWith('/reports')
                ? 'g-reports'
                : '';

  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const g = groupOf(selectedKey);
    return g ? [g] : [];
  });

  useEffect(() => {
    const g = groupOf(selectedKey);
    if (g) setOpenKeys((prev) => (prev.includes(g) ? prev : [...prev, g]));
  }, [selectedKey]);

  // ⌘K / Ctrl+K focuses global search
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── global search ──────────────────────────────────────────────────────────
  const searchOptions = useMemo(() => {
    const apps = applications
      .filter((a) => !scope || a.loanType === scope)
      .map((a) => ({
        value: `app:${a.id}`,
        label: (
          <div className="search-opt">
            <FileTextOutlined className="search-opt__icon" />
            <span className="search-opt__ref tnum">{a.appNumber}</span>
            <span className="search-opt__name truncate">{a.customer.name}</span>
            <span className="search-opt__meta">{a.status.replace(/_/g, ' ')}</span>
          </div>
        ),
        text: `${a.appNumber} ${a.customer.name} ${a.customer.mobile}`.toLowerCase(),
      }));

    const lns = loans
      .filter((l) => !scope || l.loanType === scope)
      .map((l) => ({
        value: `loan:${l.loanNumber}`,
        label: (
          <div className="search-opt">
            <WalletOutlined className="search-opt__icon" />
            <span className="search-opt__ref tnum">{l.loanNumber}</span>
            <span className="search-opt__name truncate">{l.customerName}</span>
            <span className="search-opt__meta">{l.status}</span>
          </div>
        ),
        text: `${l.loanNumber} ${l.customerName} ${l.mobile}`.toLowerCase(),
      }));

    return [...apps, ...lns];
  }, [applications, loans, scope]);

  const [searchValue, setSearchValue] = useState('');
  const unread = notifications.filter((n) => !n.read).length;

  const notifPanel = (
    <div className="notif">
      <div className="notif__head">
        <span className="panel__title">Notifications</span>
        <Button type="link" size="small" onClick={markAllRead} disabled={unread === 0}>
          Mark all read
        </Button>
      </div>
      <div className="notif__list">
        {notifications.length === 0 && (
          <div className="notif__empty t-meta">You're all caught up.</div>
        )}
        {notifications.map((n) => {
          const ico = NOTIF_ICON[n.type] ?? NOTIF_ICON.system;
          return (
            <div key={n.id} className={`notif__item${n.read ? '' : ' notif__item--unread'}`}>
              <span className={`work-row__slot tone-${ico.tone}`}>{ico.icon}</span>
              <div className="grow">
                <div className="work-row__title">{n.title}</div>
                <div className="work-row__sub">{n.description}</div>
                <div className="notif__time">
                  <ClockCircleOutlined /> {fmtTimeAgo(n.at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const profileMenu: MenuProps = {
    items: [
      {
        key: 'info',
        label: (
          <div className="profile-card">
            <div className="profile-card__name">{user.name}</div>
            <div className="t-meta">{user.email}</div>
            <div className="mt-2">
              <RoleTag role={user.role} />
            </div>
            <div className="profile-card__branch">
              <BankOutlined /> {user.branch}
            </div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      ...(can('settings')
        ? [{ key: 'settings', icon: <SettingOutlined />, label: 'Settings' }]
        : []),
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'settings') navigate('/settings');
      if (key === 'logout') {
        modal.confirm({
          title: `Sign out of ${BRAND.wordmark}?`,
          content: 'Your session will be ended securely on this device.',
          okText: 'Sign out',
          okButtonProps: { danger: true },
          onOk: () => {
            logout();
            navigate('/login', { replace: true });
          },
        });
      }
    },
  };

  /* ── Sider content — shared by the docked sider and the mobile drawer ───── */
  const siderBody = (showBrand: boolean): React.ReactNode => (
    <>
      {showBrand && (
        <div className="brand">
          <LogoMark size={32} title={collapsed ? BRAND.wordmark : undefined} />
          {!collapsed && (
            <div className="truncate">
              <div className="brand__name">{BRAND.wordmark}</div>
              <div className="brand__product">{BRAND.product}</div>
            </div>
          )}
        </div>
      )}

      <div className="app-sider__scroll">
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[selectedKey]}
          openKeys={collapsed && !isMobile ? undefined : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          onClick={({ key }) => String(key).startsWith('/') && navigate(String(key))}
          inlineIndent={16}
        />
      </div>

      {!collapsed && (
        <div className="sider-foot">
          <span className="live-dot" />
          LOS + LMS · v2.4.1
        </div>
      )}
    </>
  );

  return (
    <Layout className="app-shell">
      {/* WCAG 2.4.1 bypass block. Must be the first focusable thing on the page:
          without it a keyboard or screen-reader user tabs through the whole
          sider — 16 nav items — on every single route change. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={264}
          closable={false}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
          className="sider-drawer"
        >
          {siderBody(true)}
        </Drawer>
      ) : (
        <Sider
          className="app-sider"
          theme="light"
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={244}
          collapsedWidth={68}
        >
          {siderBody(true)}
        </Sider>
      )}

      <Layout>
        <Header className="app-header">
          <Button
            type="text"
            aria-label={
              isMobile ? 'Open navigation' : collapsed ? 'Expand navigation' : 'Collapse navigation'
            }
            icon={
              isMobile ? (
                <MenuOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
          />

          <AutoComplete
            className="global-search"
            value={searchValue}
            options={searchOptions
              .filter((o) =>
                searchValue.trim().length >= 2
                  ? o.text.includes(searchValue.trim().toLowerCase())
                  : false,
              )
              .slice(0, 8)}
            onChange={setSearchValue}
            onSelect={(value: string) => {
              const [kind, id] = value.split(':');
              setSearchValue('');
              if (kind === 'app') navigate(`/applications/view/${id}`);
              if (kind === 'loan') navigate(`/lms/accounts/${id}`);
            }}
          >
            <Input
              id="global-search"
              // A placeholder is not an accessible name (WCAG 3.3.2) — it is the
              // lowest-priority name source and it vanishes the moment you type.
              aria-label="Search applications, loans and customers"
              prefix={<SearchOutlined />}
              suffix={!isMobile && <span className="kbd">⌘K</span>}
              placeholder={isMobile ? 'Search…' : 'Search applications, loans, customers…'}
              variant="filled"
              allowClear
            />
          </AutoComplete>

          <div className="grow" />

          {/* Row density is one preference for the whole product, set here once,
              rather than a control repeated on fifteen separate ledgers. */}
          {!isMobile && (
            <>
              <DensityToggle value={density} onChange={setDensity} />
              <span className="hdr-divider" />
            </>
          )}

          <Popover content={notifPanel} trigger="click" placement="bottomRight" arrow={false}>
            <Badge count={unread} size="small" offset={[-2, 4]}>
              <Button type="text" aria-label="Notifications" icon={<BellOutlined />} />
            </Badge>
          </Popover>

          <Tooltip title="Help & support">
            <Button
              type="text"
              aria-label="Help and support"
              icon={<QuestionCircleOutlined />}
              onClick={() => message.info('Help & Support — reach your administrator or ops desk.')}
            />
          </Tooltip>

          <span className="hdr-divider" />

          <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
            <button className="hdr-profile" type="button">
              <Avatar size={26} className={`avatar-tone tone-${roleTone(user.role)}`}>
                {initials(user.name)}
              </Avatar>
              {!isMobile && (
                <>
                  <span className="hdr-profile__text">
                    <span className="hdr-profile__name">{user.name}</span>
                    <span className="hdr-profile__role">{meta.short}</span>
                  </span>
                  <DownOutlined className="hdr-profile__caret" />
                </>
              )}
            </button>
          </Dropdown>
        </Header>

        <Content>
          {/* tabIndex={-1} so the skip link can actually move focus here, not
              just scroll to it — an anchor jump alone leaves focus on the link. */}
          <div className="app-content" id="main" tabIndex={-1}>
            {/* A session running on fallback grants is a DEGRADED session — the
                navigation may not match what the API will actually authorise.
                Say so, rather than letting it pass for a normal one. */}
            {permissionError && (
              <Alert
                type="warning"
                showIcon
                banner
                className="mb-4"
                title={permissionError}
                description="Navigation is showing your role’s default access. Some actions may still be refused by the server."
              />
            )}

            <div className="enter" key={location.pathname}>
              <Outlet />
            </div>
            <footer className="app-foot">
              <span>
                {BRAND.wordmark} · {BRAND.product} — internal use only
              </span>
              <nav className="app-foot__links" aria-label="Policies">
                <Link to="/legal/privacy">Privacy</Link>
                <Link to="/legal/terms">Terms</Link>
                <Link to="/legal/refund">Refund</Link>
                <Link to="/legal/cookies">Cookies</Link>
              </nav>
            </footer>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
