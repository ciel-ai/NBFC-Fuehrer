import React, { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Tag } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../../store/appStore';
import PageHeader from '../../components/PageHeader';
import { exportCsv } from '../../utils/csv';
import { fmtDateTime } from '../../utils/format';
import type { AuditLog } from '../../types';
import { settingsApi } from '../../api/settings.api';
import DataTable from '../../components/DataTable';

const { RangePicker } = DatePicker;

const MODULES = [
  'Applications',
  'Credit',
  'Finance',
  'Collections',
  'User Management',
  'Settings',
  'Auth',
];

const MODULE_COLOR: Record<string, string> = {
  Applications: 'var(--accent)',
  Credit: 'var(--status-warning-fg)',
  Finance: 'var(--status-success-fg)',
  Collections: 'var(--status-overdue-fg)',
  'User Management': 'var(--status-violet-fg)',
  Settings: 'var(--ink-600)',
  Auth: 'var(--status-info-fg)',
};

const AuditLogs: React.FC = () => {
  const auditLogs = useAppStore((s) => s.auditLogs);
  const [realLogs, setRealLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    settingsApi
      .getAuditLogs({ limit: 100 })
      .then((res) => {
        if (res.data?.length) setRealLogs(res.data);
      })
      .catch(() => {});
  }, []);

  const logList = realLogs.length > 0 ? realLogs : auditLogs;
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const roles = useMemo(() => [...new Set(logList.map((l) => l.role))].sort(), [logList]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logList.filter((l) => {
      if (moduleFilter && l.module !== moduleFilter) return false;
      if (roleFilter && l.role !== roleFilter) return false;
      if (range?.[0] && dayjs(l.at).isBefore(range[0].startOf('day'))) return false;
      if (range?.[1] && dayjs(l.at).isAfter(range[1].endOf('day'))) return false;
      if (q && !`${l.user} ${l.action} ${l.entity} ${l.ip}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logList, search, moduleFilter, roleFilter, range]);

  const columns: TableProps<AuditLog>['columns'] = [
    {
      title: 'Date & Time',
      dataIndex: 'at',
      width: 185,
      render: (v: string) => <span className="tnum u-sm u-ink-600">{fmtDateTime(v)}</span>,
      sorter: (a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'User',
      dataIndex: 'user',
      width: 190,
      render: (v: string, r) => (
        <div>
          <div className="u-semibold u-sm u-ink-900">{v}</div>
          <div className="u-xs u-ink-400">{r.role}</div>
        </div>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      width: 145,
      render: (v: string) => (
        <Tag
          style={{
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: MODULE_COLOR[v] ?? 'var(--ink-600)',
            background: `${MODULE_COLOR[v] ?? 'var(--ink-600)'}10`,
            borderColor: `${MODULE_COLOR[v] ?? 'var(--ink-600)'}30`,
          }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (v: string) => <span className="u-medium u-sm">{v}</span>,
    },
    {
      title: 'Entity',
      dataIndex: 'entity',
      width: 200,
      render: (v: string) => <span className="u-sm u-accent u-semibold">{v}</span>,
    },
    {
      title: 'Old Value',
      dataIndex: 'oldValue',
      width: 145,
      render: (v?: string) =>
        v ? (
          <Tag
            style={{
              borderRadius: 6,
              fontSize: 11,
              background: 'var(--status-danger-tint)',
              color: 'var(--status-danger-fg)',
              borderColor: 'var(--status-danger-tint)',
              maxWidth: 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {v}
          </Tag>
        ) : (
          <span style={{ color: 'var(--ink-200)' }}>—</span>
        ),
    },
    {
      title: 'New Value',
      dataIndex: 'newValue',
      width: 165,
      render: (v?: string) =>
        v ? (
          <Tag
            style={{
              borderRadius: 6,
              fontSize: 11,
              background: 'var(--status-success-tint)',
              color: 'var(--status-success-fg)',
              borderColor: 'var(--status-success-tint)',
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {v}
          </Tag>
        ) : (
          <span style={{ color: 'var(--ink-200)' }}>—</span>
        ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      width: 125,
      render: (v: string) => <span className="tnum u-sm u-ink-500">{v}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle={`Immutable activity trail across the platform · ${rows.length} events`}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `audit-logs-${dayjs().format('YYYYMMDD')}`,
                [
                  'Date & Time',
                  'User',
                  'Role',
                  'Module',
                  'Action',
                  'Entity',
                  'Old Value',
                  'New Value',
                  'IP',
                ],
                rows.map((l) => [
                  fmtDateTime(l.at),
                  l.user,
                  l.role,
                  l.module,
                  l.action,
                  l.entity,
                  l.oldValue ?? '',
                  l.newValue ?? '',
                  l.ip,
                ]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '16px 18px',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--ink-100)',
          }}
        >
          <Input
            prefix={<SearchOutlined className="u-ink-400" />}
            placeholder="Search user, action, entity, IP…"
            allowClear
            style={{ width: 290 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label="Module"
            placeholder="Module"
            allowClear
            style={{ width: 175 }}
            value={moduleFilter}
            onChange={setModuleFilter}
            options={MODULES.map((m) => ({ value: m, label: m }))}
          />
          <Select
            aria-label="Role"
            placeholder="Role"
            allowClear
            style={{ width: 165 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={roles.map((r) => ({ value: r, label: r }))}
          />
          <RangePicker
            value={range as any}
            onChange={(v) => setRange(v as any)}
            style={{ width: 250 }}
          />
        </div>
        <DataTable<AuditLog>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1280 }}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} events`,
          }}
        />
      </Card>
    </div>
  );
};

export default AuditLogs;
