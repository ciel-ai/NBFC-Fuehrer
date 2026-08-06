import React from 'react';
import { Space } from 'antd';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
  back?: React.ReactNode;
  /** Opt out of setting the browser tab title (for a secondary header on a page). */
  skipDocumentTitle?: boolean;
}

/**
 * Page title block. The title is the only 20px element on a screen — everything
 * else steps down from it, which is what gives a dense page a readable entry point.
 *
 * It also owns the browser tab title: every screen already routes its name
 * through here, so this is the one place that can keep <title> and <h1> in step.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  extra,
  back,
  skipDocumentTitle,
}) => {
  useDocumentTitle(skipDocumentTitle ? null : title);

  return (
    <header className="page-header">
      <div className="row gap-3">
        {back}
        <div>
          <h1 className="t-page-title">{title}</h1>
          {subtitle && <div className="t-meta mt-1">{subtitle}</div>}
        </div>
      </div>
      {extra && (
        <Space wrap size={8}>
          {extra}
        </Space>
      )}
    </header>
  );
};

export default PageHeader;
