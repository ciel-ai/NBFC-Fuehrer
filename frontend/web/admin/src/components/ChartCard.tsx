import React from 'react';
import { Card } from 'antd';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  height?: number;
  children: React.ReactNode;
}

/** Standard analytics card wrapper with a fixed-height chart area. */
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, extra, height = 280, children }) => (
  <Card
    className="lift"
    variant="borderless"
    style={{ border: '1px solid #e4e8ee', height: '100%' }}
    styles={{ body: { padding: '17px 20px 12px' } }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#10202f', letterSpacing: -0.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#6b7785', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {extra}
    </div>
    <div style={{ height, width: '100%' }}>{children}</div>
  </Card>
);

export default ChartCard;

/** Shared recharts tooltip styling */
export const tooltipStyle: React.CSSProperties = {
  background: '#10202f',
  border: 'none',
  borderRadius: 7,
  padding: '8px 12px',
  boxShadow: '0 8px 24px rgba(16,32,47,0.22)',
  fontSize: 12,
  color: '#fff',
};

export const tooltipItemStyle: React.CSSProperties = { color: '#dfe5ec', fontSize: 12, padding: 0 };
export const tooltipLabelStyle: React.CSSProperties = { color: '#93a0ae', fontSize: 11, marginBottom: 4 };
