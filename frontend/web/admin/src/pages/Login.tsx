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

/** Flat line-art figure for the brand panel (matches the reference style). */
const HeroFigure: React.FC = () => (
  <svg className="wl-illus" viewBox="0 0 300 340" fill="none" aria-hidden="true">
    {/* rear leg */}
    <path d="M148 210 C120 250 78 268 52 296 L44 288 C70 258 108 240 132 202 Z"
      fill="#eef6ff" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* front leg */}
    <path d="M170 214 C178 252 172 286 178 316 L162 318 C154 286 156 250 150 218 Z"
      fill="#eef6ff" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* shoe accents */}
    <path d="M40 286 L58 300 L36 308 Z" fill="#0f172a" />
    <path d="M158 314 L182 314 L176 330 L154 328 Z" fill="#0f172a" />
    {/* torso — sweater */}
    <path d="M132 108 C110 122 104 158 116 190 C134 214 176 216 192 196 C204 168 200 132 182 112 C166 100 146 100 132 108 Z"
      fill="#7cc3f0" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* pointing arm */}
    <path d="M182 124 C210 122 238 116 258 106 L262 118 C242 130 214 138 188 142 Z"
      fill="#7cc3f0" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* hand */}
    <path d="M258 104 L276 96 L280 104 L266 114 Z" fill="#f8d9c4" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* back arm */}
    <path d="M128 124 C116 142 112 162 118 178 L130 174 C126 158 130 142 138 130 Z"
      fill="#5eb2ea" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
    {/* neck + head */}
    <path d="M150 108 L154 92 L172 94 L170 110 Z" fill="#f8d9c4" stroke="#0f172a" strokeWidth="3" />
    <ellipse cx="164" cy="70" rx="24" ry="26" fill="#f8d9c4" stroke="#0f172a" strokeWidth="3" />
    {/* hair + beard */}
    <path d="M142 62 C142 44 158 38 168 40 C184 42 192 54 190 66 C182 58 172 54 164 56 C152 58 146 60 142 68 Z"
      fill="#0f172a" />
    <path d="M146 76 C148 92 158 100 168 98 C178 96 186 88 188 76 C186 92 180 106 166 106 C152 106 146 90 146 76 Z"
      fill="#0f172a" opacity="0.9" />
    {/* ground shadow */}
    <ellipse cx="140" cy="326" rx="90" ry="8" fill="#0f172a" opacity="0.08" />
  </svg>
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
          <HeroFigure />
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
