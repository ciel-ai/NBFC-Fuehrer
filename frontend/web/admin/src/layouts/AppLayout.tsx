import React, { useEffect, useMemo, useState } from 'react';
import {
  App, AutoComplete, Avatar, Badge, Button, ConfigProvider, Dropdown, Input, Layout, Menu, Popover, Tag, Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined, AuditOutlined, BankOutlined, BarChartOutlined, BellOutlined,
  DownOutlined, FileTextOutlined, FolderOpenOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PhoneOutlined, PlusOutlined,
  QuestionCircleOutlined, SafetyCertificateOutlined, SearchOutlined, SettingOutlined, TeamOutlined,
  WalletOutlined, ExclamationCircleOutlined, ClockCircleOutlined, ThunderboltOutlined,
  UsergroupAddOutlined, GoldOutlined, ApartmentOutlined, IdcardOutlined,
} from '@ant-design/icons';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { SessionUser } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { ROLE_META, canAccess, scopedLoanType } from '../auth/rbac';
import type { ModuleKey } from '../auth/rbac';
import { fmtTimeAgo, initials } from '../utils/format';

const { Sider, Header, Content } = Layout;

const NOTIF_ICON: Record<string, React.ReactNode> = {
  application: <FileTextOutlined style={{ color: '#2563eb' }} />,
  credit: <SafetyCertificateOutlined style={{ color: '#b26a00' }} />,
  finance: <BankOutlined style={{ color: '#1d7a46' }} />,
  collection: <ExclamationCircleOutlined style={{ color: '#c0392b' }} />,
  system: <ThunderboltOutlined style={{ color: '#64748b' }} />,
};

const AppLayout: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <LayoutInner user={user} />;
};

const LayoutInner: React.FC<{ user: SessionUser }> = ({ user }) => {
  const { modal, message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const notifications = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllRead);

  const meta = ROLE_META[user.role];
  const scope = scopedLoanType(user.role);
  const can = (m: ModuleKey): boolean => canAccess(user.role, m);

  // ── sidebar items, filtered by role ──
  const menuItems = useMemo(() => {
    const items: MenuProps['items'] = [];
    items.push({ key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard' });

    if (canAccess(user.role, 'applications')) {
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
    if (canAccess(user.role, 'customers')) {
      items.push({ key: '/customers', icon: <IdcardOutlined />, label: 'Customers' });
    }
    if (canAccess(user.role, 'appraisals')) {
      items.push({ key: '/appraisals', icon: <GoldOutlined />, label: 'Appraisals' });
    }
    if (canAccess(user.role, 'credit')) {
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
    if (canAccess(user.role, 'finance')) {
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
    if (canAccess(user.role, 'lms')) {
      items.push({
        key: 'g-lms',
        icon: <WalletOutlined />,
        label: 'LMS',
        children: [
          { key: '/lms/accounts', label: 'Loan Accounts' },
          { key: '/lms/emi-schedule', label: 'EMI Schedule' },
          { key: '/lms/repayments', label: 'Repayments' },
          { key: '/lms/charges', label: 'Charges' },
          { key: '/lms/documents', label: 'Documents' },
        ],
      });
    }
    if (canAccess(user.role, 'collections')) {
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
    if (canAccess(user.role, 'reports')) {
      const fam = ROLE_META[user.role].family;
      const children = [
        { key: '/reports/los', label: 'LOS Reports', show: user.role === 'ADMIN' },
        { key: '/reports/credit', label: 'Credit Reports', show: user.role === 'ADMIN' || fam === 'CREDIT' },
        { key: '/reports/finance', label: 'Finance Reports', show: user.role === 'ADMIN' || fam === 'FINANCE' },
        { key: '/reports/collections', label: 'Collection Reports', show: user.role === 'ADMIN' },
      ].filter((c) => c.show).map(({ key, label }) => ({ key, label }));
      items.push({ key: 'g-reports', icon: <BarChartOutlined />, label: 'Reports', children });
    }
    if (canAccess(user.role, 'agents')) items.push({ key: '/agents', icon: <UsergroupAddOutlined />, label: 'Agents' });
    if (canAccess(user.role, 'branches')) items.push({ key: '/branches', icon: <ApartmentOutlined />, label: 'Branches' });
    if (canAccess(user.role, 'users')) items.push({ key: '/users', icon: <TeamOutlined />, label: 'User Management' });
    if (canAccess(user.role, 'audit')) items.push({ key: '/audit', icon: <AuditOutlined />, label: 'Audit Logs' });
    if (canAccess(user.role, 'settings')) items.push({ key: '/settings', icon: <SettingOutlined />, label: 'Settings' });
    return items;
  }, [user.role]);

  // longest matching menu key → selected
  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/applications/view')) return '/applications';
    if (location.pathname.startsWith('/lms/accounts')) return '/lms/accounts';
    const keys: string[] = [];
    const collect = (items: MenuProps['items']): void => {
      items?.forEach((it: any) => {
        if (it?.key && String(it.key).startsWith('/')) keys.push(String(it.key));
        if (it?.children) collect(it.children);
      });
    };
    collect(menuItems);
    const match = keys
      .filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0];
    return match ?? location.pathname;
  }, [location.pathname, menuItems]);

  const groupOf = (key: string): string =>
    key.startsWith('/applications') ? 'g-applications'
    : key.startsWith('/credit') ? 'g-credit'
    : key.startsWith('/finance') ? 'g-finance'
    : key.startsWith('/lms') ? 'g-lms'
    : key.startsWith('/collections') ? 'g-collections'
    : key.startsWith('/reports') ? 'g-reports' : '';

  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const g = groupOf(selectedKey);
    return g ? [g] : [];
  });

  useEffect(() => {
    const g = groupOf(selectedKey);
    if (g) setOpenKeys((prev) => (prev.includes(g) ? prev : [...prev, g]));
  }, [selectedKey]);

  // ⌘K / Ctrl+K focuses the global search
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

  // ── global search ──
  const searchOptions = useMemo(() => {
    const apps = applications
      .filter((a) => !scope || a.loanType === scope)
      .map((a) => ({
        value: `app:${a.id}`,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span><FileTextOutlined style={{ color: '#2563eb', marginRight: 8 }} />{a.appNumber} · {a.customer.name}</span>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{a.status.replace(/_/g, ' ')}</span>
          </div>
        ),
        text: `${a.appNumber} ${a.customer.name} ${a.customer.mobile}`.toLowerCase(),
      }));
    const lns = loans
      .filter((l) => !scope || l.loanType === scope)
      .map((l) => ({
        value: `loan:${l.loanNumber}`,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span><WalletOutlined style={{ color: '#1d7a46', marginRight: 8 }} />{l.loanNumber} · {l.customerName}</span>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{l.status}</span>
          </div>
        ),
        text: `${l.loanNumber} ${l.customerName} ${l.mobile}`.toLowerCase(),
      }));
    return [...apps, ...lns];
  }, [applications, loans, scope]);

  const [searchValue, setSearchValue] = useState('');

  const unread = notifications.filter((n) => !n.read).length;

  const notifPanel = (
    <div style={{ width: 372 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px 10px' }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
        <Button type="link" size="small" onClick={markAllRead} disabled={unread === 0}>
          Mark all read
        </Button>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              display: 'flex', gap: 12, padding: '11px 12px', borderRadius: 10,
              background: n.read ? 'transparent' : '#e9f3fa', marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 34, height: 34, minWidth: 34, borderRadius: 9, background: '#f4f6fb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}
            >
              {NOTIF_ICON[n.type]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>{n.description}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {fmtTimeAgo(n.at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const profileMenu: MenuProps = {
    items: [
      {
        key: 'info',
        label: (
          <div style={{ padding: '6px 4px', minWidth: 220 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: '#7c8aa3', marginTop: 2 }}>{user.email}</div>
            <Tag style={{ marginTop: 8, color: meta.color, background: `${meta.color}12`, borderColor: `${meta.color}30`, fontWeight: 600 }}>
              {meta.label}
            </Tag>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>
              <BankOutlined style={{ marginRight: 5 }} />{user.branch}
            </div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      ...(can('settings') ? [{ key: 'settings', icon: <SettingOutlined />, label: 'Settings' }] : []),
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'settings') navigate('/settings');
      if (key === 'logout') {
        modal.confirm({
          title: 'Sign out of FUEHRER NBFC?',
          icon: <LogoutOutlined style={{ color: '#c0392b' }} />,
          content: 'Your session will be ended securely.',
          okText: 'Sign Out',
          okButtonProps: { danger: true },
          onOk: () => {
            logout();
            navigate('/login', { replace: true });
          },
        });
      }
    },
  };

  return (
    <Layout className="nbfc-shell" style={{ minHeight: '100vh' }}>
      <Sider
        className="app-sider nbfc-sidebar"
        theme="dark"
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={256}
        collapsedWidth={78}
        style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'auto', zIndex: 50,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="sider-brand" style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : undefined }}>
          <div className="brand-mark">F</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>FUEHRER CAPITAL</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 1 }}>Lending Operations</div>
            </div>
          )}
        </div>

        <div className="sider-cta" style={{ padding: collapsed ? '8px 14px 12px' : undefined }}>
          <Button
            className="new-app-btn"
            icon={<PlusOutlined />}
            onClick={() => navigate(can('applications') ? '/applications' : '/dashboard')}
          >
            {!collapsed && 'New Application'}
          </Button>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg: 'transparent',
                darkSubMenuItemBg: 'transparent',
                darkItemColor: 'rgba(255,255,255,0.82)',
                darkItemHoverColor: '#ffffff',
                darkItemHoverBg: 'rgba(255,255,255,0.10)',
                darkItemSelectedColor: '#ffffff',
                darkItemSelectedBg: 'rgba(255,255,255,0.18)',
                darkGroupTitleColor: 'rgba(255,255,255,0.5)',
                iconSize: 18,
                itemHeight: 42,
                itemMarginInline: 10,
                itemBorderRadius: 10,
                fontSize: 14,
              },
            },
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            items={menuItems}
            selectedKeys={[selectedKey]}
            openKeys={collapsed ? undefined : openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            onClick={({ key }) => String(key).startsWith('/') && navigate(String(key))}
            style={{ background: 'transparent', padding: '4px 10px 24px', border: 'none' }}
          />
        </ConfigProvider>

        {!collapsed && (
          <div className="sider-foot">
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 9 }}>
              Platform
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span className="live-dot" /> LOS + LMS · v2.4.1
            </div>
            <div style={{ marginTop: 7 }}>
              <span className="sider-link" onClick={() => message.info('Help & Support — reach your administrator or ops desk.')}>
                Help &amp; Support ↗
              </span>
            </div>
          </div>
        )}
      </Sider>

      <Layout>
        <Header
          className="app-header"
          style={{
            padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid #eef1f6',
            position: 'sticky', top: 0, zIndex: 40, gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="hdr-icon"
            />
            <AutoComplete
              value={searchValue}
              options={searchOptions.filter((o) =>
                searchValue.trim().length >= 2 ? o.text.includes(searchValue.trim().toLowerCase()) : false,
              ).slice(0, 8)}
              onChange={setSearchValue}
              onSelect={(value: string) => {
                const [kind, id] = value.split(':');
                setSearchValue('');
                if (kind === 'app') navigate(`/applications/view/${id}`);
                else navigate(`/lms/accounts/${id}`);
              }}
              style={{ width: 480, maxWidth: '46vw' }}
            >
              <Input
                id="global-search"
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                suffix={<span className="kbd">⌘ K</span>}
                placeholder="Search applications, loan accounts, customers…"
                variant="filled"
                allowClear
              />
            </AutoComplete>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Popover content={notifPanel} trigger="click" placement="bottomRight" arrow={false}>
              <Badge count={unread} size="small" offset={[-3, 6]}>
                <Button type="text" className="hdr-icon" icon={<BellOutlined style={{ fontSize: 17 }} />} />
              </Badge>
            </Popover>
            <Tooltip title="Help & Support">
              <Button type="text" className="hdr-icon" icon={<QuestionCircleOutlined style={{ fontSize: 17 }} />}
                onClick={() => message.info('Help & Support — reach your administrator or ops desk.')} />
            </Tooltip>
            {can('settings') && (
              <Tooltip title="Settings">
                <Button type="text" className="hdr-icon" icon={<SettingOutlined style={{ fontSize: 17 }} />}
                  onClick={() => navigate('/settings')} />
              </Tooltip>
            )}

            <div style={{ width: 1, height: 28, background: '#eef1f6', margin: '0 6px' }} />

            <Dropdown menu={profileMenu} placement="bottomRight" trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 6px', borderRadius: 10 }}>
                <Avatar
                  size={36}
                  style={{ background: meta.color, fontWeight: 600, fontSize: 13 }}
                >
                  {initials(user.name)}
                </Avatar>
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{user.name}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{user.branch}</div>
                </div>
                <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ background: 'var(--page-bg)' }}>
          <div style={{ padding: '24px 28px', maxWidth: 1680, width: '100%', margin: '0 auto' }}>
            <div className="page-fade" key={location.pathname}>
              <Outlet />
            </div>
            <div style={{ textAlign: 'center', padding: '18px 0 4px', fontSize: 11.5, color: '#9aa7bd' }}>
              <FolderOpenOutlined style={{ marginRight: 6 }} />
              FUEHRER NBFC · Lending Operations Suite — internal use only
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
