import React from 'react';
import { Space } from 'antd';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
  back?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra, back }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 24,
      flexWrap: 'wrap',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {back}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: -0.5 }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{ marginTop: 4, fontSize: 13.5, color: '#6b7280' }}>{subtitle}</div>
        )}
      </div>
    </div>
    {extra && <Space wrap>{extra}</Space>}
  </div>
);

export default PageHeader;
