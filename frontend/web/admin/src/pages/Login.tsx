import React, { useEffect, useState } from 'react';
import { App, Button, Checkbox, ConfigProvider, Form, Input } from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, BankOutlined, LockOutlined, MobileOutlined,
  SafetyCertificateOutlined, UserOutlined,
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

/** Vivid royal-blue used only on the login surface (app chrome stays institutional navy). */
const LOGIN_BLUE = '#2563eb';

const loginTheme = {
  token: {
    colorPrimary: LOGIN_BLUE,
    colorLink: LOGIN_BLUE,
    colorLinkHover: '#1d57d6',
    borderRadius: 9,
    controlHeight: 38,
    controlHeightLG: 40,
    fontSize: 13,
  },
};

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
    <div className="login-bg">
      {/* decorative field — fixed & clipped so it never blocks page scroll */}
      <div className="lb-field">
        <div className="lb-deco lb-circles" />
        <div className="lb-deco lb-shape-tr" />
        <div className="lb-deco lb-shape-br" />
        <div className="lb-deco lb-dots lb-dots-tl" />
        <div className="lb-deco lb-dots lb-dots-br" />
        <div className="lb-deco lb-lines" />
        <span className="lb-deco lb-dot lb-dot-1" />
        <span className="lb-deco lb-ring lb-ring-1" />
      </div>

      <ConfigProvider theme={loginTheme}>
        <div className="login-stage">
          <div className="login-card auth-rise">
            {/* brand lockup */}
            <div style={{ textAlign: 'center' }}>
              <div className="login-logo">F</div>
              <div style={{ marginTop: 11, fontSize: 16.5, fontWeight: 800, color: '#10202f', letterSpacing: 0.3 }}>
                FUEHRER CAPITAL
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#8a97a6' }}>Lending Operations Suite</div>
            </div>

            {/* welcome */}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: LOGIN_BLUE }}>Welcome back</div>
              <h1 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 800, color: '#10202f', letterSpacing: -0.3 }}>
                Sign in to your account
              </h1>
              <div style={{ marginTop: 4, fontSize: 12.5, color: '#7c8896' }}>Enter your credentials to continue</div>
            </div>

            {/* portal tabs */}
            <div className="seg" style={{ marginTop: 16 }}>
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`seg-item${portal === t.value ? ' active' : ''}`}
                  onClick={() => switchPortal(t.value)}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* form */}
            <div style={{ marginTop: 16 }}>
              {portal === 'Admin' ? (
                <Form form={adminForm} layout="vertical" onFinish={handleAdmin} requiredMark={false}>
                  <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Enter your username' }]}>
                    <Input size="large" prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Enter your username" autoFocus />
                  </Form.Item>
                  <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password' }]} style={{ marginBottom: 14 }}>
                    <Input.Password size="large" prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Enter your password" />
                  </Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Checkbox defaultChecked>
                      <span style={{ color: '#4a5663', fontSize: 13.5 }}>Remember me</span>
                    </Checkbox>
                    <Button type="link" size="small" style={{ padding: 0, fontWeight: 600 }}
                      onClick={() => message.info('Contact your administrator to reset your password.')}>
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="primary" size="large" htmlType="submit" block loading={loading}
                    icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end">
                    Sign in
                  </Button>
                </Form>
              ) : otpStage === 'phone' ? (
                <Form form={phoneForm} layout="vertical" onFinish={sendOtp} requiredMark={false}>
                  <Form.Item
                    label="Phone Number"
                    name="phone"
                    rules={[
                      { required: true, message: 'Enter your mobile number' },
                      { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
                    ]}
                    style={{ marginBottom: 22 }}
                  >
                    <Input size="large" addonBefore="+91" prefix={<MobileOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Enter your phone number" maxLength={10} autoFocus />
                  </Form.Item>
                  <Button type="primary" size="large" htmlType="submit" block loading={loading}
                    icon={!loading ? <ArrowRightOutlined /> : undefined} iconPosition="end">
                    Send OTP
                  </Button>
                </Form>
              ) : (
                <Form form={otpForm} layout="vertical" onFinish={verifyOtp} requiredMark={false}>
                  <div style={{ marginBottom: 18 }}>
                    <Button type="link" size="small" icon={<ArrowLeftOutlined />} onClick={resetOtpFlow} style={{ paddingLeft: 0 }}>
                      Change number
                    </Button>
                    <div style={{ fontSize: 13.5, color: '#4a5663', marginTop: 4 }}>
                      Enter the 6-digit OTP sent to <strong>+91 {phone}</strong>
                    </div>
                  </div>
                  <Form.Item name="otp" rules={[{ required: true, message: 'Enter the OTP' }, { len: 6, message: 'OTP is 6 digits' }]}>
                    <Input.OTP length={6} size="large" autoFocus style={{ width: '100%' }} />
                  </Form.Item>
                  <Button type="primary" size="large" htmlType="submit" block loading={loading} style={{ marginTop: 4 }}>
                    Verify &amp; Sign In
                  </Button>
                  <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, color: '#7c8896' }}>
                    {resendIn > 0 ? (
                      <>Resend OTP in 00:{String(resendIn).padStart(2, '0')}</>
                    ) : (
                      <Button type="link" size="small" onClick={() => { void requestOtp(phone); }}>
                        Resend OTP
                      </Button>
                    )}
                  </div>
                </Form>
              )}
            </div>
          </div>

          {/* footer trust */}
          <div className="login-foot">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontSize: 13.5, fontWeight: 600 }}>
              <SafetyCertificateOutlined />
              Secure &amp; compliant platform
            </div>
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.78)' }}>
              256-bit encryption &nbsp;·&nbsp; RBI Compliant &nbsp;·&nbsp; Trusted by NBFCs
            </div>
          </div>

        </div>
      </ConfigProvider>
    </div>
  );
};

export default Login;
