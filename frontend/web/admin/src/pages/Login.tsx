import React, { useEffect, useState } from 'react';
import { App, Button, Checkbox, Form, Input } from 'antd';
import {
  ArrowLeftOutlined, BankOutlined, DownOutlined, SafetyCertificateOutlined, UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { staffAuthApi, staffAuthError } from '../api/staffAuth.api';
import type { StaffAuthResult, StaffPortal } from '../api/staffAuth.api';

type Portal = 'Admin' | 'Credit Team' | 'Finance Team';

const TABS: { label: string; value: Portal; icon: React.ReactNode }[] = [
  { label: 'Admin', value: 'Admin', icon: <UserOutlined /> },
  { label: 'Credit', value: 'Credit Team', icon: <SafetyCertificateOutlined /> },
  { label: 'Finance', value: 'Finance Team', icon: <BankOutlined /> },
];

/** Floating dashboard-preview cards for the brand panel — pure shapes, always crisp. */
const HeroCards: React.FC = () => (
  <div className="wl-hero" aria-hidden="true">
    <div className="wl-ring" />
    <div className="wl-ring wl-ring--sm" />

    {/* main stat card */}
    <div className="wl-mock wl-mock--main">
      <div className="wl-mock-label">Live Book</div>
      <div className="wl-mock-value">₹2.4 Cr</div>
      <div className="wl-mock-bars">
        <span style={{ height: 16 }} /><span style={{ height: 26 }} /><span style={{ height: 20 }} />
        <span style={{ height: 34 }} /><span style={{ height: 27 }} /><span style={{ height: 42 }} />
      </div>
    </div>

    {/* secondary row card */}
    <div className="wl-mock wl-mock--row">
      <span className="wl-mock-dot" />
      <div>
        <div className="wl-mock-label">EMI collected</div>
        <div className="wl-mock-strong">₹4,82,300</div>
      </div>
      <span className="wl-mock-pill">+12.4%</span>
    </div>

    {/* small chip card */}
    <div className="wl-mock wl-mock--chip">
      <span className="wl-mock-check">✓</span> Disbursal approved
    </div>
  </div>
);

const Login: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const [portal, setPortal] = useState<Portal>('Admin');
  const [otpStage, setOtpStage] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adminForm] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [otpForm] = Form.useForm();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const portalFamily: StaffPortal = portal === 'Credit Team' ? 'CREDIT' : 'FINANCE';

  /** Persist the authenticated session (user + real JWT pair) and enter the portal. */
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
    navigate('/dashboard', { replace: true });
  };

  const handleAdmin = async (values: { username: string; password: string }): Promise<void> => {
    setLoading(true);
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
    try {
      const r = await staffAuthApi.otpRequest(toPhone, portalFamily);
      setPhone(toPhone);
      setOtpStage('otp');
      setResendIn(30);
      // devOtp is only returned by non-production builds of the API
      message.success(r.devOtp
        ? `OTP sent to +91 ${toPhone} (dev OTP: ${r.devOtp})`
        : `OTP sent to +91 ${toPhone}`);
    } catch (err) {
      message.error(staffAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = (values: { phone: string }): void => { void requestOtp(values.phone); };

  const verifyOtp = async (values: { otp: string }): Promise<void> => {
    setLoading(true);
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
  };

  const resetOtpFlow = (): void => {
    setOtpStage('phone');
    otpForm.resetFields();
  };

  return (
    <div className="wl-page">
      <div className="wl-card auth-rise">

        {/* ── brand panel ── */}
        <aside className="wl-left">
          <div className="wl-brand">Fuehrer</div>
          <div className="wl-tag">
            Lending operations, beautifully unified — origination to collections in one portal.
          </div>
          <HeroCards />
        </aside>

        {/* ── form panel ── */}
        <section className="wl-right">
          <div className="wl-lang">ENGLISH (IN) <DownOutlined style={{ fontSize: 9 }} /></div>

          <div className="wl-body">
            <h1 className="wl-title">
              {portal === 'Admin' ? 'Sign in to Fuehrer' : `${portal} sign in`}
            </h1>
            <div className="wl-sub">Staff access · secure &amp; RBI-compliant.</div>

            {/* portal switcher — same three roles, restyled as outlined chips */}
            <div className="wl-portals">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`wl-portal${portal === t.value ? ' active' : ''}`}
                  onClick={() => switchPortal(t.value)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {portal === 'Admin' ? (
              <Form form={adminForm} layout="vertical" onFinish={handleAdmin} requiredMark={false}>
                <Form.Item name="username" rules={[{ required: true, message: 'Enter your username' }]} className="wl-item">
                  <Input className="u-input" variant="borderless" placeholder="Username" autoFocus />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]} className="wl-item">
                  <Input.Password className="u-input" variant="borderless" placeholder="Password" />
                </Form.Item>
                <div className="wl-row">
                  <Checkbox defaultChecked><span className="wl-muted">Remember me</span></Checkbox>
                  <Button type="link" size="small" style={{ padding: 0, fontWeight: 600 }}
                    onClick={() => message.info('Contact your administrator to reset your password.')}>
                    Forgot password?
                  </Button>
                </div>
                <Button className="wl-btn" type="primary" htmlType="submit" block loading={loading}>
                  Sign In
                </Button>
              </Form>
            ) : otpStage === 'phone' ? (
              <Form form={phoneForm} layout="vertical" onFinish={sendOtp} requiredMark={false}>
                <Form.Item
                  name="phone"
                  rules={[
                    { required: true, message: 'Enter your mobile number' },
                    { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                  ]}
                  className="wl-item"
                >
                  <Input
                    className="u-input"
                    variant="borderless"
                    prefix={<span className="wl-prefix">+91</span>}
                    placeholder="Phone Number"
                    maxLength={10}
                    autoFocus
                  />
                </Form.Item>
                <Button className="wl-btn" type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 26 }}>
                  Send OTP
                </Button>
              </Form>
            ) : (
              <Form form={otpForm} layout="vertical" onFinish={verifyOtp} requiredMark={false}>
                <Button type="link" size="small" icon={<ArrowLeftOutlined />} onClick={resetOtpFlow} style={{ paddingLeft: 0 }}>
                  Change number
                </Button>
                <div className="wl-muted" style={{ margin: '6px 0 16px' }}>
                  Enter the 6-digit OTP sent to <strong>+91 {phone}</strong>
                </div>
                <Form.Item name="otp" rules={[{ required: true, message: 'Enter the OTP' }, { len: 6, message: 'OTP is 6 digits' }]}>
                  <Input.OTP length={6} size="large" autoFocus style={{ width: '100%' }} />
                </Form.Item>
                <Button className="wl-btn" type="primary" htmlType="submit" block loading={loading}>
                  Verify &amp; Sign In
                </Button>
                <div className="wl-muted" style={{ textAlign: 'center', marginTop: 14 }}>
                  {resendIn > 0
                    ? <>Resend OTP in 00:{String(resendIn).padStart(2, '0')}</>
                    : <Button type="link" size="small" onClick={() => { void requestOtp(phone); }}>Resend OTP</Button>}
                </div>
              </Form>
            )}

            <div className="wl-foot">
              Trouble signing in? <a onClick={() => message.info('Reach your administrator or ops desk.')}>Contact administrator</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
