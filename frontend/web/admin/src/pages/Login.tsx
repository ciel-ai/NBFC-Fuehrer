import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Form, Input } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { staffAuthApi, staffAuthError } from '../api/staffAuth.api';
import type { StaffAuthResult, StaffPortal } from '../api/staffAuth.api';
import { USE_MOCK } from '../config';
import { BRAND } from '../theme/tokens';
import { LogoMark } from '../components/Logo';
import './Login.css';

/* ============================================================================
 * Staff sign-in — "the register".
 *
 * A ruled record, not a card: one vertical hairline (the ledger gutter) splits
 * an editorial identity column from the sign-in mechanism. Three access paths
 * live behind one desk switcher — Admin (username + password) and the Credit /
 * Finance desks (registered-mobile → OTP). One accent (sky) is spent in exactly
 * three structural places: the desk indicator, the input focus line, the button.
 * ==========================================================================*/

type Portal = 'Admin' | 'Credit Team' | 'Finance Team';

const PORTALS: { value: Portal; tab: string; label: string }[] = [
  { value: 'Admin', tab: 'Admin', label: 'Administration' },
  { value: 'Credit Team', tab: 'Credit', label: 'the Credit desk' },
  { value: 'Finance Team', tab: 'Finance', label: 'the Finance desk' },
];

const Login: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const [portal, setPortal] = useState<Portal>('Admin');
  const [otpStage, setOtpStage] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminForm] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [otpForm] = Form.useForm();

  /* Where to land after sign-in. Defaults to the dashboard, but a session that
     expired mid-task leaves a return path (see api/client.ts) so we can drop the
     user back where they were interrupted. */
  const [landing, setLanding] = useState('/dashboard');

  const activeIndex = PORTALS.findIndex((p) => p.value === portal);
  const active = PORTALS[activeIndex] ?? PORTALS[0];

  /* Roving focus for the desk tablist, tracked separately from the selected
     desk (ARIA manual-activation: arrows move focus, Enter/Space commits). */
  const [focusIndex, setFocusIndex] = useState(activeIndex);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setFocusIndex(activeIndex), [activeIndex]);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  /* The "Session Expired" state: if we arrived here from an expired session,
     say so once and remember where to return. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('fuehrer.sessionEnded');
      if (!raw) return;
      sessionStorage.removeItem('fuehrer.sessionEnded');
      const info = JSON.parse(raw) as { from?: string };
      if (info.from && info.from !== '/login') setLanding(info.from);
      message.info('Your session expired. Please sign in again.');
    } catch {
      /* malformed note — ignore */
    }
    // Read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const portalFamily: StaffPortal = portal === 'Credit Team' ? 'CREDIT' : 'FINANCE';
  const year = useMemo(() => new Date().getFullYear(), []);

  const finishLogin = (result: StaffAuthResult): void => {
    const u = result.user;
    login(
      {
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        phone: u.phone,
        branch: u.branch ?? 'Head Office',
        loginAt: new Date().toISOString(),
      },
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
    );
    message.success(`Welcome back, ${u.name.split(' ')[0]}`);
    navigate(landing, { replace: true });
  };

  const handleAdmin = async (values: { username: string; password: string }): Promise<void> => {
    setLoading(true);
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      login(
        {
          id: 'mock-admin-1',
          name: 'Mock Administrator',
          role: 'SUPER_ADMIN',
          email: 'admin@mock.dev',
          phone: '9999900000',
          branch: 'Head Office',
          loginAt: new Date().toISOString(),
        },
        { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      );
      message.success('Signed in (mock mode)');
      navigate(landing, { replace: true });
      setLoading(false);
      return;
    }
    try {
      const result = await staffAuthApi.login(values.username.trim(), values.password);
      finishLogin(result);
    } catch (err) {
      message.error(staffAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (toPhone: string): Promise<void> => {
    setLoading(true);
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      setPhone(toPhone);
      setOtpStage('otp');
      setResendIn(30);
      message.success(`OTP sent to +91 ${toPhone} (mock OTP: 123456)`);
      setLoading(false);
      return;
    }
    try {
      const r = await staffAuthApi.otpRequest(toPhone, portalFamily);
      setPhone(toPhone);
      setOtpStage('otp');
      setResendIn(30);
      message.success(
        r.devOtp
          ? `OTP sent to +91 ${toPhone} (dev OTP: ${r.devOtp})`
          : `OTP sent to +91 ${toPhone}`,
      );
    } catch (err) {
      message.error(staffAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (values: { otp: string }): Promise<void> => {
    setLoading(true);
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const roleMap: Record<string, string> = {
        'Credit Team': 'CREDIT_CDL',
        'Finance Team': 'FINANCE_CDL',
      };
      login(
        {
          id: `mock-${portal.toLowerCase().replace(' ', '-')}-1`,
          name: `Mock ${portal}`,
          role: (roleMap[portal] ?? 'CREDIT_CDL') as never,
          email: `mock@${portal.toLowerCase().replace(' ', '')}.dev`,
          phone,
          branch: 'Head Office',
          loginAt: new Date().toISOString(),
        },
        { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
      );
      message.success(`Signed in as ${portal} (mock mode)`);
      navigate(landing, { replace: true });
      setLoading(false);
      return;
    }
    try {
      const result = await staffAuthApi.otpVerify(phone, values.otp, portalFamily);
      finishLogin(result);
    } catch (err) {
      message.error(staffAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const switchPortal = (p: Portal): void => {
    setPortal(p);
    setOtpStage('phone');
    setShowPw(false);
  };

  /* ARIA authoring practice: roving tabindex + manual activation. */
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    let next = focusIndex;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (focusIndex + 1) % PORTALS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (focusIndex - 1 + PORTALS.length) % PORTALS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = PORTALS.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        switchPortal(PORTALS[focusIndex].value);
        return;
      default:
        return;
    }
    e.preventDefault();
    setFocusIndex(next);
    tabRefs.current[next]?.focus();
  };

  const hint =
    portal === 'Admin'
      ? 'Enter your administrator username and password.'
      : otpStage === 'phone'
        ? `We'll send a one-time code to the mobile registered against ${active.label}.`
        : `Enter the six-digit code sent to +91 ${phone}.`;

  return (
    <div className="auth">
      <header className="auth__masthead">
        <div className="auth__bar-inner">
          <span className="auth__wordmark">
            <LogoMark size={32} className="auth__logo" />
            {BRAND.wordmark}
          </span>
          <span className="auth__masthead-note">{BRAND.product} &middot; Staff access</span>
        </div>
      </header>

      <main className="auth__main">
        <section className="auth__split">
          <div className="auth__identity">
            <div className="auth__identity-inner">
              <p className="auth__eyebrow">Staff sign-in</p>
              <h1 className="auth__title">The lending operations console.</h1>
              <p className="auth__lead">
                Originate, underwrite, and service the loan book from a single desk.
              </p>
              <dl className="auth__entity">
                <dt>Regulated entity</dt>
                <dd className="auth__entity-name">{BRAND.legalName}</dd>
                <dd className="auth__entity-note">
                  Non-Banking Financial Company &middot; Regulated by the Reserve Bank of India
                </dd>
              </dl>
            </div>
          </div>

          <div className="auth__form-pane">
            <div className="auth__form-inner">
              <span className="auth__label" id="desk-label">
                Desk
              </span>
              <div
                className="auth__desk"
                role="tablist"
                aria-labelledby="desk-label"
                onKeyDown={onTabKeyDown}
                style={{ ['--desk-i' as string]: activeIndex } as React.CSSProperties}
              >
                {PORTALS.map((p, i) => (
                  <button
                    key={p.value}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    id={`desk-tab-${p.value}`}
                    type="button"
                    role="tab"
                    aria-selected={portal === p.value}
                    aria-controls="desk-panel"
                    tabIndex={focusIndex === i ? 0 : -1}
                    className="auth__tab"
                    onClick={() => switchPortal(p.value)}
                  >
                    {p.tab}
                  </button>
                ))}
                <span className="auth__desk-ind" aria-hidden="true" />
              </div>

              <p className="auth__hint">{hint}</p>

              <div
                id="desk-panel"
                role="tabpanel"
                aria-labelledby={`desk-tab-${portal}`}
                className="auth__panel-region"
              >
                <div className="auth__anim" key={`${portal}-${otpStage}`}>
                  {portal === 'Admin' ? (
                    <Form
                      form={adminForm}
                      layout="vertical"
                      onFinish={handleAdmin}
                      requiredMark={false}
                      className="auth__fields"
                    >
                      <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true, message: 'Enter your username' }]}
                      >
                        <Input size="large" autoFocus autoComplete="username" placeholder="you" />
                      </Form.Item>

                      <Form.Item
                        name="password"
                        label={
                          <span className="auth__label-row">
                            Password
                            <button
                              type="button"
                              className="auth__reveal"
                              aria-pressed={showPw}
                              onClick={() => setShowPw((v) => !v)}
                            >
                              {showPw ? 'Hide' : 'Show'}
                            </button>
                          </span>
                        }
                        rules={[{ required: true, message: 'Enter your password' }]}
                      >
                        <Input
                          size="large"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Your password"
                        />
                      </Form.Item>

                      <div className="auth__submit">
                        <Button
                          type="primary"
                          htmlType="submit"
                          className="auth__go"
                          block
                          loading={loading}
                        >
                          Sign in
                        </Button>
                        <button
                          type="button"
                          className="auth__link"
                          onClick={() =>
                            message.info('Contact your administrator to reset your password.')
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                    </Form>
                  ) : otpStage === 'phone' ? (
                    <Form
                      form={phoneForm}
                      layout="vertical"
                      onFinish={(v: { phone: string }) => void requestOtp(v.phone)}
                      requiredMark={false}
                      className="auth__fields"
                    >
                      <Form.Item
                        name="phone"
                        label="Registered mobile number"
                        rules={[
                          { required: true, message: 'Enter your mobile number' },
                          { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                        ]}
                      >
                        <Input
                          size="large"
                          prefix={<span className="auth__dial">+91</span>}
                          maxLength={10}
                          inputMode="numeric"
                          autoFocus
                          autoComplete="tel-national"
                          placeholder="00000 00000"
                        />
                      </Form.Item>

                      <div className="auth__submit">
                        <Button
                          type="primary"
                          htmlType="submit"
                          className="auth__go"
                          block
                          loading={loading}
                        >
                          Send code
                        </Button>
                      </div>
                    </Form>
                  ) : (
                    <Form
                      form={otpForm}
                      layout="vertical"
                      onFinish={verifyOtp}
                      requiredMark={false}
                      className="auth__fields"
                    >
                      <button
                        type="button"
                        className="auth__back"
                        onClick={() => {
                          setOtpStage('phone');
                          otpForm.resetFields();
                        }}
                      >
                        <ArrowLeftOutlined /> Change number
                      </button>

                      <Form.Item
                        name="otp"
                        label={`Code sent to +91 ${phone}`}
                        rules={[
                          { required: true, message: 'Enter the code' },
                          { len: 6, message: 'The code is 6 digits' },
                        ]}
                      >
                        <Input.OTP length={6} size="large" autoFocus />
                      </Form.Item>

                      <div className="auth__submit">
                        <Button
                          type="primary"
                          htmlType="submit"
                          className="auth__go"
                          block
                          loading={loading}
                        >
                          Verify and continue
                        </Button>
                        {resendIn > 0 ? (
                          <span className="auth__link is-muted auth__tnum">
                            Resend code in 0:{String(resendIn).padStart(2, '0')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="auth__link"
                            onClick={() => void requestOtp(phone)}
                          >
                            Resend code
                          </button>
                        )}
                      </div>
                    </Form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="auth__foot">
        <div className="auth__bar-inner">
          <span className="auth__foot-legal">
            &copy; {year} {BRAND.legalName} &middot; Access is monitored and logged
          </span>
          <nav className="auth__foot-links">
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/terms">Terms</Link>
            <Link to="/legal/refund">Refund</Link>
            <Link to="/legal/cookies">Cookies</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Login;
