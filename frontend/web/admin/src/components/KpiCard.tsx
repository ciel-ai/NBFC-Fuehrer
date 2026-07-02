import React from 'react';
import { Card } from 'antd';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tint: string; // hex color for the icon chip — used sparingly, for category not decoration
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon, tint, onClick }) => (
  <Card
    className="kpi-card"
    variant="borderless"
    style={{
      border: '1px solid #e4e8ee',
      cursor: onClick ? 'pointer' : 'default',
      height: '100%',
    }}
    styles={{ body: { padding: '17px 18px' } }}
    onClick={onClick}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: '#7c8896',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 34,
          height: 34,
          minWidth: 34,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: tint,
          background: `${tint}14`,
        }}
      >
        {icon}
      </div>
    </div>
    <div
      className="tnum"
      style={{ fontSize: 26, fontWeight: 700, color: '#10202f', lineHeight: 1.1, letterSpacing: -0.6, marginTop: 12 }}
    >
      {value}
    </div>
    {sub !== undefined && (
      <div style={{ fontSize: 12, color: '#7c8896', marginTop: 6 }}>{sub}</div>
    )}
  </Card>
);

export default KpiCard;
