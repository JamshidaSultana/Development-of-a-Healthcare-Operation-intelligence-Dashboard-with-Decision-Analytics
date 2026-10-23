import React, { useEffect, useMemo, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams
} from 'react-router-dom';

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Moon,
  Package,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Sun,
  Users,
  WalletCards,
  X,
  Zap
} from 'lucide-react';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { api } from './api';
import { AuthProvider, useAuth } from './AuthContext';

const nav = [
  ['dashboard', 'Executive Command Center', LayoutDashboard],
  ['patients', 'Patient Operations', Users],
  ['staff', 'Doctor & Staff Intelligence', Stethoscope],
  ['billing', 'Billing & Revenue Intelligence', WalletCards],
  ['claims', 'Insurance & Claims Automation', ShieldCheck],
  ['pharmacy', 'Pharmacy & Inventory', Package],
  ['quality', 'Quality & Compliance', ShieldCheck],
  ['copilot', 'AI Agent / Copilot', MessageCircle]
];

const quickQuestions = [
  'Show me doctors with low utilization',
  'Which claims are likely to be denied?',
  'How many beds will we need next week?',
  'Generate today’s hospital operations report'
];

const fallbackSummary =
  'Overall hospital performance is strong with a 12% increase in patient volume and 15% revenue growth compared to last month. Bed occupancy is at 78%, with Cardiology and Orthopedics among the top revenue generators.';

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

function isFutureMonth(month) {
  if (!month) return false;

  const now = new Date();
  const [year, monthNumber] = month.split('-').map(Number);

  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() &&
      monthNumber > now.getMonth() + 1)
  );
}

function formatMonth(month, style = 'long') {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(
    'en-IN',
    {
      month: style,
      year: 'numeric'
    }
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Protected />} />
      </Routes>
    </AuthProvider>
  );
}

function Protected() {
  const { user } = useAuth();

  return user ? (
    <Shell />
  ) : (
    <Navigate to="/login" replace />
  );
}

function Login() {
  const { user, login } = useAuth();
  const navg = useNavigate();

  const [email, setEmail] = useState('admin@medops.local');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (user) {
      navg('/dashboard', { replace: true });
    }
  }, [user, navg]);

  const submit = async e => {
    e.preventDefault();
    setErr('');

    try {
      await login(email, password);
      navg('/dashboard');
    } catch (x) {
      setErr(
        x.response?.data?.message ||
          'Login failed'
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">
          <HeartPulse size={32} />
        </div>

        <h1>Medical Operations</h1>

        <p>
          Intelligence Dashboard & Automation System
        </p>

        {err && (
          <div className="error-box">
            {err}
          </div>
        )}

        <form onSubmit={submit}>
          <label>
            Email
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e =>
                setPassword(e.target.value)
              }
            />
          </label>

          <button className="primary full">
            Sign in
          </button>
        </form>

        <div className="demo-note">
          Demo admin: <b>admin@medops.local</b> ·{' '}
          <b>Demo@12345</b>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navg = useNavigate();
  const [params, setParams] = useSearchParams();

  const [mobile, setMobile] = useState(false);
  const [bell, setBell] = useState(false);
  const [profile, setProfile] = useState(false);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState('');

  const [locationOpen, setLocationOpen] =
    useState(false);

  const [monthOpen, setMonthOpen] =
    useState(false);

  const location =
    params.get('location') ||
    'All Locations';

  const month =
    params.get('month') ||
    getCurrentMonth();

  const locations = [
    'All Locations',
    'Hyderabad',
    'Bengaluru',
    'Chennai',
    'Mumbai',
    'Delhi',
    'Pune'
  ];

  const months = Array.from(
    { length: 12 },
    (_, i) =>
      `2026-${String(i + 1).padStart(2, '0')}`
  );

  const monthLabel = formatMonth(
    month,
    'short'
  );

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };

  const navigateSearch = () => {
    const s = search
      .toLowerCase()
      .trim();

    const hit = nav.find(
      n =>
        n[1]
          .toLowerCase()
          .includes(s) ||
        n[0].includes(s)
    );

    if (hit) {
      navg(
        '/' +
          hit[0] +
          '?' +
          params.toString()
      );
    } else if (s.includes('report')) {
      downloadReport();
    }

    setSearch('');
  };

  useEffect(() => {
    document.body.classList.toggle(
      'dark',
      dark
    );
  }, [dark]);

  const downloadReport = () =>
    window.open(
      (import.meta.env.VITE_API_URL ||
        'http://localhost:5000/api') +
        '/ai/executive-report.pdf?month=' +
        month +
        '&location=' +
        encodeURIComponent(location),
      '_blank'
    );

  return (
    <div className="app-shell">
      <aside
        className={
          'sidebar ' +
          (mobile ? 'show' : '')
        }
      >
        <div className="sidebar-brand">
          <div className="logo">
            <HeartPulse />
          </div>

          <div>
            <div className="brand-title">
              Medical Operations
            </div>

            <div className="brand-sub">
              Intelligence Dashboard
            </div>
          </div>

          <button
            className="icon-btn mobile-only"
            onClick={() =>
              setMobile(false)
            }
          >
            <X />
          </button>
        </div>

        <div className="tagline">
          Smarter Data <i /> Healthier Operations{' '}
          <i /> Better Patient Outcomes
        </div>

        <nav>
          {nav.map(
            ([key, label, Icon]) => (
              <button
                key={key}
                className={
                  'side-link ' +
                  (loc.pathname ===
                  '/' + key
                    ? 'active'
                    : '')
                }
                onClick={() => {
                  navg(
                    '/' +
                      key +
                      '?' +
                      params.toString()
                  );
                  setMobile(false);
                }}
              >
                <Icon size={18} />
                <span>{label}</span>

                {key === 'copilot' && (
                  <span className="new-dot">
                    AI
                  </span>
                )}
              </button>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="health-mini">
            <div className="health-ring">
              <span>92%</span>
            </div>

            <div>
              <b>
                Operational Health Score
              </b>

              <small>
                Excellent <em>+4%</em> last
                month
              </small>
            </div>
          </div>

          <button
            className="side-link"
            onClick={() =>
              navg('/settings')
            }
          >
            <Settings size={18} />
            Settings
          </button>

          <button
            className="side-link"
            onClick={logout}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() =>
              setMobile(true)
            }
          >
            <Menu />
          </button>

          <div className="top-search">
            <Search size={17} />

            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              onKeyDown={e =>
                e.key === 'Enter' &&
                navigateSearch()
              }
              placeholder="Search patients, claims, modules..."
            />

            <button onClick={navigateSearch}>
              Search
            </button>
          </div>

          <div className="top-actions">
            <div className="relative">
              <button
                className="selector"
                onClick={() => {
                  setLocationOpen(
                    !locationOpen
                  );
                  setMonthOpen(false);
                }}
              >
                <Activity size={16} />
                {location}
                <ChevronDown size={15} />
              </button>

              {locationOpen && (
                <Dropdown title="Select location">
                  {locations.map(x => (
                    <button
                      key={x}
                      onClick={() => {
                        setFilter(
                          'location',
                          x
                        );
                        setLocationOpen(
                          false
                        );
                      }}
                      className={
                        location === x
                          ? 'selected-option'
                          : ''
                      }
                    >
                      {x}
                    </button>
                  ))}
                </Dropdown>
              )}
            </div>

            <div className="relative">
              <button
                className="selector"
                onClick={() => {
                  setMonthOpen(
                    !monthOpen
                  );
                  setLocationOpen(false);
                }}
              >
                <CalendarDays size={16} />
                {monthLabel}
                <ChevronDown size={15} />
              </button>

              {monthOpen && (
                <Dropdown title="Select month">
                  {months.map(x => {
                    const future =
                      isFutureMonth(x);

                    return (
                      <button
                        key={x}
                        disabled={future}
                        onClick={() => {
                          if (!future) {
                            setFilter(
                              'month',
                              x
                            );
                            setMonthOpen(
                              false
                            );
                          }
                        }}
                        className={
                          (month === x
                            ? 'selected-option '
                            : '') +
                          (future
                            ? 'future-month'
                            : '')
                        }
                      >
                        {formatMonth(
                          x,
                          'long'
                        )}

                        {future &&
                          ' — Upcoming'}
                      </button>
                    );
                  })}
                </Dropdown>
              )}
            </div>

            <div className="relative">
              <button
                className="icon-btn"
                onClick={() =>
                  setBell(!bell)
                }
              >
                <Bell />
                <span className="notif-dot">
                  3
                </span>
              </button>

              {bell && (
                <Dropdown title="Notifications">
                  <Notification text="Claim denial spike – Aetna" />
                  <Notification text="ED waiting time above target" />
                  <Notification text="Low bed availability – Branch 2" />
                </Dropdown>
              )}
            </div>

            <button
              className="icon-btn"
              onClick={() =>
                setDark(!dark)
              }
            >
              {dark ? <Sun /> : <Moon />}
            </button>

            <div className="relative">
              <button
                className="profile-btn"
                onClick={() =>
                  setProfile(!profile)
                }
              >
                <span className="avatar">
                  GV
                </span>

                <span>
                  <b>
                    Gandhe Varshitha
                  </b>
                  <small>
                    Administrator
                  </small>
                </span>

                <ChevronDown size={15} />
              </button>

              {profile && (
                <Dropdown title="Account">
                  <button
                    onClick={() =>
                      navg('/settings')
                    }
                  >
                    Profile settings
                  </button>

                  <button onClick={logout}>
                    Sign out
                  </button>
                </Dropdown>
              )}
            </div>
          </div>
        </header>

        <Routes>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/patients"
            element={<Patients />}
          />

          <Route
            path="/staff"
            element={<Staff />}
          />

          <Route
            path="/billing"
            element={<Billing />}
          />

          <Route
            path="/claims"
            element={<Claims />}
          />

          <Route
            path="/pharmacy"
            element={<Pharmacy />}
          />

          <Route
            path="/quality"
            element={<Quality />}
          />

          <Route
            path="/copilot"
            element={<Copilot />}
          />

          <Route
            path="/settings"
            element={<SettingsPage />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function Dropdown({ title, children }) {
  return (
    <div className="dropdown">
      <b>{title}</b>

      <div className="dropdown-body">
        {children}
      </div>
    </div>
  );
}

function Notification({ text }) {
  return (
    <button
      className="notification"
      onClick={() => alert(text)}
    >
      <Bell size={15} />
      {text}
    </button>
  );
}

function Dashboard() {
  const [params] = useSearchParams();

  const location =
    params.get('location') ||
    'All Locations';

  const month =
    params.get('month') ||
    getCurrentMonth();

  const [
    data,
    setData
  ] = useState(null);

  const [vol, setVol] = useState([]);
  const [dept, setDept] = useState([]);

  const [summary, setSummary] =
    useState(fallbackSummary);

  const [modal, setModal] =
    useState(null);

  const futureMonth =
    isFutureMonth(month);

  useEffect(() => {
    let alive = true;

    if (futureMonth) {
      setData({
        upcoming: true,
        patients: 0,
        admissions: 0,
        discharges: 0,
        revenue: 0,
        occupancy: 0,
        health: 0,
        avgWait: 0,
        denialRate: 0
      });

      setVol([]);
      setDept([]);

      setSummary(
        `${formatMonth(
          month,
          'long'
        )} has not started yet. Operational data will become available when the month begins.`
      );

      return () => {
        alive = false;
      };
    }

    (async () => {
      const qs =
        `?month=${month}` +
        `&location=${encodeURIComponent(
          location
        )}`;

      const results =
        await Promise.allSettled([
          api.get(
            '/dashboard/summary' +
              qs
          ),
          api.get(
            '/dashboard/patient-volume' +
              qs
          ),
          api.get(
            '/dashboard/revenue-by-department' +
              qs
          ),
          api.get(
            '/ai/daily-summary' +
              qs
          )
        ]);

      if (!alive) return;

      const [a, b, c, d] = results;

      if (a.status === 'fulfilled') {
        setData(a.value.data);
      }

      if (b.status === 'fulfilled') {
        setVol(b.value.data);
      }

      if (c.status === 'fulfilled') {
        setDept(c.value.data);
      }

      if (d.status === 'fulfilled') {
        setSummary(
          d.value.data.summary
        );
      }

      setData(x => x || {});
    })().catch(() => {
      if (alive) {
        setData({});
      }
    });

    return () => {
      alive = false;
    };
  }, [
    month,
    location,
    futureMonth
  ]);

  const display = data || {};

  const patientTrend =
    useMemo(
      () =>
        vol.map(x => ({
          date: new Date(
            x.date + 'T00:00:00'
          ).toLocaleDateString(
            'en-IN',
            {
              day: 'numeric',
              month: 'short'
            }
          ),

          patients: x.value,

          admissions: Math.max(
            0,
            Math.round(
              x.value * 0.13
            )
          ),

          discharges: Math.max(
            0,
            Math.round(
              x.value * 0.12
            )
          )
        })),
      [vol]
    );

  const revenueData =
    dept.length
      ? dept.map(x => ({
          name:
            x.name ===
            'General Medicine'
              ? 'General Med.'
              : x.name,
          value: Number(
            (x.value / 100000).toFixed(
              1
            )
          )
        }))
      : [];

  const total =
    display.patients || 0;

  const flow = [
    {
      name: 'OP Visits',
      value: Math.max(
        0,
        total -
          (display.admissions ||
            0) -
          (display.discharges ||
            0)
      )
    },
    {
      name: 'Admissions',
      value:
        display.admissions || 0
    },
    {
      name: 'Discharges',
      value:
        display.discharges || 0
    },
    {
      name: 'ED Visits',
      value: Math.round(
        total * 0.086
      )
    },
    {
      name: 'Others',
      value: Math.round(
        total * 0.086
      )
    }
  ];

  const facilityLocations = [
    ['Main Hospital', 'Hyderabad'],
    ['Branch 1', 'Bengaluru'],
    ['Branch 2', 'Chennai'],
    ['Branch 3', 'Pune']
  ];

  if (!data) {
    return (
      <div className="page-loader">
        Loading command center...
      </div>
    );
  }

  if (futureMonth) {
    return (
      <div className="dashboard-grid">
        <section className="dashboard-main">
          <div className="page-heading">
            <div>
              <h1>
                <Activity size={25} />
                Executive Command Center
              </h1>

              <p>
                <b>
                  {formatMonth(
                    month,
                    'long'
                  )}
                </b>{' '}
                is an upcoming month. Operational
                data will appear once the month
                begins.
              </p>
            </div>

            <div className="location-tabs">
              <span className="filter-chip">
                {location}
              </span>

              <span className="filter-chip">
                Upcoming
              </span>
            </div>
          </div>

          <div className="card upcoming-card">
            <div className="upcoming-icon">
              <CalendarDays size={36} />
            </div>

            <h2>
              {formatMonth(
                month,
                'long'
              )} has not started yet
            </h2>

            <p>
              There is no operational data to
              display for this month yet.
            </p>

            <p>
              Select a completed month from the
              month selector to view historical
              dashboard data.
            </p>
          </div>
        </section>

        <aside className="copilot-panel">
          <div className="copilot-head">
            <div className="ai-icon">
              AI
            </div>

            <div>
              <b>
                AI Medical Operations Copilot
              </b>

              <small>
                Operational intelligence assistant
              </small>
            </div>
          </div>

          <CopilotBox
            compact
            location={location}
            month={month}
          />
        </aside>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="dashboard-main">
        <div className="page-heading">
          <div>
            <h1>
              <Activity size={25} />
              Executive Command Center
            </h1>

            <p>
              Real-time operational overview for{' '}
              <b>{location}</b> ·{' '}
              {formatMonth(
                month,
                'long'
              )}
            </p>
          </div>

          <div className="location-tabs">
            <span className="filter-chip">
              {location}
            </span>

            <span className="filter-chip">
              {formatMonth(
                month,
                'short'
              )}
            </span>
          </div>
        </div>

        <div className="kpi-grid">
          <KPI
            icon={Users}
            label="Total Patients"
            value={(
              display.patients || 0
            ).toLocaleString()}
            change="12%"
            tone="blue"
          />

          <KPI
            icon={ClipboardList}
            label="Admissions"
            value={(
              display.admissions || 0
            ).toLocaleString()}
            change="8%"
            tone="green"
          />

          <KPI
            icon={FileText}
            label="Discharges"
            value={(
              display.discharges || 0
            ).toLocaleString()}
            change="10%"
            tone="purple"
          />

          <KPI
            icon={WalletCards}
            label="Revenue"
            value={
              '₹ ' +
              Math.round(
                display.revenue || 0
              ).toLocaleString('en-IN')
            }
            change="15%"
            tone="orange"
          />

          <KPI
            icon={CalendarDays}
            label="Bed Occupancy"
            value={
              (display.occupancy || 0) +
              '%'
            }
            change="6%"
            tone="red"
          />

          <KPI
            icon={HeartPulse}
            label="Operational Health Score"
            value={
              (display.health || 0) +
              '%'
            }
            change="4%"
            tone="teal"
          />
        </div>

        <div className="chart-row">
          <Card
            title="Patient Volume Trend"
            action={
              <div className="legend">
                <span>
                  <i className="b" />
                  Patients
                </span>

                <span>
                  <i className="g" />
                  Admissions
                </span>

                <span>
                  <i className="p" />
                  Discharges
                </span>
              </div>
            }
          >
            <div className="chart">
              <ResponsiveContainer>
                <LineChart
                  data={patientTrend}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 8 }}
                  />

                  <YAxis
                    tick={{ fontSize: 8 }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="patients"
                    stroke="#2782df"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="admissions"
                    stroke="#25a87a"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="discharges"
                    stroke="#8054d6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            title="Revenue by Department"
            action={
              <span className="generated">
                Selected month
              </span>
            }
          >
            <div className="chart">
              <ResponsiveContainer>
                <BarChart
                  data={revenueData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 8 }}
                  />

                  <YAxis
                    tick={{ fontSize: 8 }}
                  />

                  <Tooltip
                    formatter={v =>
                      `₹${v}L`
                    }
                  />

                  <Bar
                    dataKey="value"
                    radius={[
                      4,
                      4,
                      0,
                      0
                    ]}
                    fill="#2e82df"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Patient Flow">
            <div className="donut-wrap">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={flow}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {flow.map(
                      (_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              '#2e82df',
                              '#28a97c',
                              '#7d55d6',
                              '#f2bd42',
                              '#e96969'
                            ][i]
                          }
                        />
                      )
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <b>
                  {total.toLocaleString()}
                </b>

                <span>
                  {formatMonth(
                    month,
                    'short'
                  )}{' '}
                  Total
                </span>
              </div>
            </div>

            <div className="flow-list">
              {flow.map(
                (x, i) => (
                  <div key={x.name}>
                    <span>
                      <i
                        style={{
                          background:
                            [
                              '#2e82df',
                              '#28a97c',
                              '#7d55d6',
                              '#f2bd42',
                              '#e96969'
                            ][i]
                        }}
                      />

                      {x.name}
                    </span>

                    <b>
                      {x.value.toLocaleString()}
                    </b>

                    <small>
                      {total
                        ? Math.round(
                            (x.value /
                              total) *
                              100
                          )
                        : 0}
                      %
                    </small>
                  </div>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="middle-row">
          <Card title="Facility Comparison">
            <table>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>City</th>
                  <th>Patients</th>
                  <th>Revenue</th>
                  <th>Occupancy</th>
                </tr>
              </thead>

              <tbody>
                {facilityLocations.map(
                  ([name, city], i) => (
                    <tr
                      key={name}
                      onClick={() =>
                        setModal({
                          title: name,
                          body:
                            `${name} · ${city}\n` +
                            `This facility view is linked to the location filter. Use the top location selector to load that city's selected-month data.`
                        })
                      }
                    >
                      <td>
                        <b>{name}</b>
                      </td>

                      <td>{city}</td>

                      <td>
                        {Math.round(
                          total *
                            (i
                              ? 0.22
                              : 0.34)
                        ).toLocaleString()}
                      </td>

                      <td>
                        ₹{' '}
                        {(
                          Math.round(
                            ((display.revenue ||
                              0) *
                              (i
                                ? 0.22
                                : 0.34)) /
                              100000
                          ) / 10
                        ).toFixed(1)}
                        L
                      </td>

                      <td>
                        {Math.max(
                          0,
                          (display.occupancy ||
                            0) -
                            i * 4
                        )}
                        %
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Card>

          <Card
            title="AI Executive Summary"
            action={
              <span className="generated">
                {formatMonth(
                  month,
                  'short'
                )}
              </span>
            }
          >
            <p className="summary">
              {summary ||
                fallbackSummary}
            </p>

            <div className="recommend">
              <b>
                Recommended actions:
              </b>

              <ul>
                <li>
                  Monitor ED waiting times
                  (target &lt; 30 mins)
                </li>

                <li>
                  Review denial and
                  inventory alerts for the
                  selected period
                </li>

                <li>
                  Use the location filter to
                  compare facility operations
                </li>
              </ul>
            </div>

            <button
              className="primary"
              onClick={() =>
                setModal({
                  title:
                    'Full AI Executive Report',
                  body:
                    summary ||
                    fallbackSummary
                })
              }
            >
              View Full Report
            </button>
          </Card>
        </div>

        <div className="module-strip">
          {[
            [
              'Patient Operations',
              Users,
              'patients',
              '12 modules'
            ],
            [
              'Doctor & Staff Intelligence',
              Stethoscope,
              'staff',
              '10 modules'
            ],
            [
              'Billing & Revenue',
              WalletCards,
              'billing',
              '11 modules'
            ],
            [
              'Insurance & Claims',
              ShieldCheck,
              'claims',
              '11 modules'
            ],
            [
              'Pharmacy & Inventory',
              Package,
              'pharmacy',
              '10 modules'
            ],
            [
              'Laboratory & Diagnostics',
              Activity,
              'quality',
              '9 modules'
            ]
          ].map(
            ([t, I, r, c]) => (
              <button
                className="module-card"
                onClick={() =>
                  window.location.href =
                    '/' +
                    r +
                    '?' +
                    params.toString()
                }
                key={t}
              >
                <I />

                <div>
                  <b>{t}</b>
                  <small>
                    View Details →
                  </small>
                  <em>{c}</em>
                </div>
              </button>
            )
          )}
        </div>

        <div className="bottom-row">
          <Card
            title="Upcoming Alerts & Exceptions"
            action={
              <button
                className="text-btn"
                onClick={() =>
                  setModal({
                    title: 'All Alerts',
                    body:
                      `Alerts for ${location}, ${month}: claim denial spike, ED waiting time, bed availability, staff absenteeism and inventory.`
                  })
                }
              >
                View All
              </button>
            }
          >
            <div className="alerts-table">
              {[
                [
                  'High',
                  'Claim denial spike – Aetna',
                  'Review denied claims'
                ],
                [
                  'High',
                  'ED waiting time above target',
                  'Review waiting time'
                ],
                [
                  'Medium',
                  'Low bed availability',
                  'Review capacity'
                ],
                [
                  'Medium',
                  'Staff absenteeism',
                  'Review staffing'
                ],
                [
                  'Info',
                  'Low inventory',
                  'Review pharmacy'
                ]
              ].map(
                (x, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setModal({
                        title:
                          x[0] +
                          ' Alert',
                        body:
                          x[1] +
                          '\n\nRecommended action: ' +
                          x[2] +
                          '.'
                      })
                    }
                  >
                    <span
                      className={
                        'priority ' +
                        x[0].toLowerCase()
                      }
                    >
                      {x[0]}
                    </span>

                    <span>{x[1]}</span>

                    <small>
                      {x[2]}
                    </small>
                  </button>
                )
              )}
            </div>
          </Card>

          <Card title="Key Performance Indicators">
            <div className="mini-kpis">
              <Mini
                label="Appointment No-Show Rate"
                value="7.8%"
                change="↓ 2%"
              />

              <Mini
                label="Avg. Waiting Time (OPD)"
                value={
                  (display.avgWait ||
                    0) + ' mins'
                }
                change="↓ 18%"
              />

              <Mini
                label="Length of Stay"
                value="2.6 days"
                change="↓ 12%"
              />

              <Mini
                label="Claim Denial Rate"
                value={
                  (display.denialRate ||
                    0) + '%'
                }
                change="↓ 5%"
              />

              <Mini
                label="Revenue per Patient"
                value={
                  '₹ ' +
                  (display.patients
                    ? Math.round(
                        (display.revenue ||
                          0) /
                          display.patients
                      ).toLocaleString(
                        'en-IN'
                      )
                    : '0')
                }
                change="↑ 14%"
              />

              <Mini
                label="Patient Satisfaction (CSAT)"
                value="4.6 / 5"
                change="↑ 8%"
              />
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="quick-actions">
              <button
                onClick={() =>
                  window.open(
                    (import.meta.env
                      .VITE_API_URL ||
                      'http://localhost:5000/api') +
                      `/ai/executive-report.pdf?month=${month}&location=${encodeURIComponent(
                        location
                      )}`,
                    '_blank'
                  )
                }
              >
                <FileText size={17} />
                Generate Report
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() =>
                  setModal({
                    title:
                      'Schedule Appointment',
                    body:
                      `Appointment scheduler for ${location}, ${month}. Open Patient Operations to create or review appointments.`
                  })
                }
              >
                <CalendarDays size={17} />
                Schedule Appointment
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() =>
                  setModal({
                    title:
                      'Send Notification',
                    body:
                      'Notification composer opened. This demo keeps messages local to the dashboard.'
                  })
                }
              >
                <Bell size={17} />
                Send Notifications
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() =>
                  (window.location.href =
                    '/patients?' +
                    params.toString())
                }
              >
                <Users size={17} />
                View Patient Records
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() =>
                  window.open(
                    (import.meta.env
                      .VITE_API_URL ||
                      'http://localhost:5000/api') +
                      `/ai/executive-report.pdf?month=${month}&location=${encodeURIComponent(
                        location
                      )}`,
                    '_blank'
                  )
                }
              >
                <Download size={17} />
                Export to PDF
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() =>
                  setModal({
                    title:
                      'Automation Workflow',
                    body:
                      'Detect → Analyze → Predict → Recommend → Alert → Assign → Track'
                  })
                }
              >
                <Zap size={17} />
                Automation Workflow
                <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        </div>

        <div className="workflow">
          <b>
            Workflow Automation in Action
          </b>

          <div className="workflow-steps">
            {[
              'Detect',
              'Analyze',
              'Predict',
              'Recommend',
              'Alert',
              'Assign',
              'Track'
            ].map((x, i) => (
              <React.Fragment key={x}>
                <button
                  onClick={() =>
                    setModal({
                      title: x,
                      body:
                        `${x} stage selected for ${location}, ${month}.`
                    })
                  }
                >
                  <span>
                    {
                      [
                        '⌁',
                        '◉',
                        '▣',
                        '✓',
                        '!',
                        '↗',
                        '◷'
                      ][i]
                    }
                  </span>

                  {x}

                  <small>
                    {
                      [
                        'Identify issue',
                        'Find root cause',
                        'Forecast outcome',
                        'Suggest action',
                        'Notify team',
                        'Create task',
                        'Monitor result'
                      ][i]
                    }
                  </small>
                </button>

                {i < 6 && (
                  <ArrowRight className="flow-arrow" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <aside className="copilot-panel">
        <div className="copilot-head">
          <div className="ai-icon">
            AI
          </div>

          <div>
            <b>
              AI Medical Operations Copilot
            </b>

            <small>
              Operational intelligence assistant
            </small>
          </div>
        </div>

        <CopilotBox
          compact
          location={location}
          month={month}
        />
      </aside>

      {modal && (
        <Modal
          title={modal.title}
          body={modal.body}
          onClose={() =>
            setModal(null)
          }
        />
      )}
    </div>
  );
}

function KPI({
  icon: I,
  label,
  value,
  change,
  tone
}) {
  return (
    <div className={'kpi ' + tone}>
      <div className="kpi-icon">
        <I />
      </div>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>

        <em>
          <ArrowUpRight size={13} />{' '}
          {change}
        </em>

        <small>
          vs. last month
        </small>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  change
}) {
  return (
    <div className="mini">
      <span>{label}</span>
      <b>{value}</b>
      <em>{change}</em>
    </div>
  );
}

function Card({
  title,
  action,
  children
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
        {action}
      </div>

      {children}
    </div>
  );
}

function CopilotBox({
  compact = false,
  location = 'All Locations',
  month = '2026-08'
}) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] =
    useState('');
  const [loading, setLoading] =
    useState(false);

  const ask = async text => {
    const question = (
      text || q
    ).trim();

    if (!question) return;

    setQ(question);
    setLoading(true);

    try {
      const { data } =
        await api.post(
          '/ai/copilot',
          {
            question,
            location,
            month
          }
        );

      setAnswer(
        data.answer ||
          'No answer returned.'
      );
    } catch (e) {
      setAnswer(
        e.response?.data?.message ||
          'AI service is unavailable. The built-in analytics mode can still answer common dashboard questions.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        compact
          ? 'copilot-box compact'
          : 'copilot-box'
      }
    >
      <div className="copilot-input">
        <input
          value={q}
          onChange={e =>
            setQ(e.target.value)
          }
          onKeyDown={e =>
            e.key === 'Enter' &&
            ask()
          }
          placeholder="Ask me anything about your hospital operations..."
        />

        <button
          onClick={() => ask()}
          disabled={loading}
        >
          <ArrowRight />
        </button>
      </div>

      {loading && (
        <div className="ai-answer">
          <b>AI</b>

          <p>
            Analyzing {location} for{' '}
            {formatMonth(
              month,
              'long'
            )}
            ...
          </p>
        </div>
      )}

      {answer && !loading && (
        <div className="ai-answer">
          <b>AI</b>

          <p>{answer}</p>

          <button
            className="report-btn"
            onClick={() =>
              window.open(
                (import.meta.env
                  .VITE_API_URL ||
                  'http://localhost:5000/api') +
                  `/ai/executive-report.pdf?month=${month}&location=${encodeURIComponent(
                    location
                  )}`,
                '_blank'
              )
            }
          >
            View Report
          </button>
        </div>
      )}

      {!answer && !loading && (
        <div className="suggestions">
          <button
            onClick={() =>
              ask(
                'What caused revenue to decrease this month?'
              )
            }
          >
            What caused revenue to decrease this month?
          </button>

          {quickQuestions.map(
            x => (
              <button
                key={x}
                onClick={() =>
                  ask(x)
                }
              >
                {x}
              </button>
            )
          )}
        </div>
      )}

      <div className="copilot-footer">
        <input
          placeholder="Type your question..."
          value={q}
          onChange={e =>
            setQ(e.target.value)
          }
          onKeyDown={e =>
            e.key === 'Enter' &&
            ask()
          }
        />

        <button
          onClick={() => ask()}
          disabled={loading}
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  body,
  onClose
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal"
        onClick={e =>
          e.stopPropagation()
        }
      >
        <div className="modal-head">
          <h2>{title}</h2>

          <button
            className="icon-btn"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        <p>{body}</p>

        <button
          className="primary"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function GenericPage({
  title,
  subtitle,
  children
}) {
  return (
    <div className="inner-page">
      <div className="page-title">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function Patients() {
  const [rows, setRows] =
    useState([]);

  const [q, setQ] =
    useState('');

  const load = () =>
    api
      .get('/patients', {
        params: { search: q }
      })
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});

  useEffect(load, []);

  return (
    <GenericPage
      title="Patient Operations"
      subtitle="Registration, admissions, discharge and patient flow"
    >
      <Card
        title="Patient Records"
        action={
          <button
            className="primary small"
            onClick={() =>
              alert(
                'New patient form is ready in this demo.'
              )
            }
          >
            + New Patient
          </button>
        }
      >
        <div className="toolbar">
          <div className="search-field">
            <Search />

            <input
              value={q}
              onChange={e =>
                setQ(e.target.value)
              }
              placeholder="Search patient ID or name"
            />

            <button onClick={load}>
              Search
            </button>
          </div>

          <button
            className="outline"
            onClick={() =>
              alert(
                'Filter options: status, department, admission date'
              )
            }
          >
            Filters
          </button>
        </div>

        <DataTable
          rows={rows.slice(0, 80)}
          columns={[
            ['patientId', 'ID'],
            ['name', 'Patient'],
            ['age', 'Age'],
            ['gender', 'Gender'],
            [
              'department',
              'Department'
            ],
            ['status', 'Status'],
            [
              'waitMinutes',
              'Wait'
            ]
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Staff() {
  const [rows, setRows] =
    useState([]);

  useEffect(() => {
    api
      .get('/staff/doctors')
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});
  }, []);

  return (
    <GenericPage
      title="Doctor & Staff Intelligence"
      subtitle="Utilization, workload and productivity"
    >
      <Card
        title="Doctor Productivity"
        action={
          <button
            className="outline"
            onClick={() =>
              alert(
                'Workload view opened'
              )
            }
          >
            View Workload
          </button>
        }
      >
        <DataTable
          rows={rows}
          columns={[
            ['name', 'Doctor'],
            [
              'department',
              'Department'
            ],
            [
              'appointments',
              'Appointments'
            ],
            [
              'utilization',
              'Utilization'
            ],
            ['shift', 'Shift']
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Billing() {
  const [rows, setRows] =
    useState([]);

  useEffect(() => {
    api
      .get('/billing/outstanding')
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});
  }, []);

  return (
    <GenericPage
      title="Billing & Revenue Intelligence"
      subtitle="Revenue, collections, leakage and outstanding payments"
    >
      <div className="page-cards">
        <Mini
          label="Revenue"
          value="₹48.72L"
          change="↑ 15%"
        />

        <Mini
          label="Collection Rate"
          value="92.4%"
          change="↑ 3%"
        />

        <Mini
          label="Leakage"
          value="₹2.1L"
          change="↓ 8%"
        />
      </div>

      <Card title="Outstanding Payments">
        <DataTable
          rows={rows}
          columns={[
            ['claimId', 'Claim'],
            [
              'patientName',
              'Patient'
            ],
            ['status', 'Status'],
            ['amount', 'Amount'],
            ['ageDays', 'Age']
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Claims() {
  const [rows, setRows] =
    useState([]);

  useEffect(() => {
    api
      .get('/claims')
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});
  }, []);

  return (
    <GenericPage
      title="Insurance & Claims Automation"
      subtitle="Denials, aging, follow-up and AI risk"
    >
      <Card title="Claims Worklist">
        <DataTable
          rows={rows.slice(0, 100)}
          columns={[
            ['claimId', 'Claim'],
            [
              'patientName',
              'Patient'
            ],
            [
              'department',
              'Department'
            ],
            ['amount', 'Amount'],
            ['status', 'Status'],
            [
              'aiPrediction',
              'AI Risk'
            ],
            [
              'followUp',
              'Follow-up'
            ]
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Pharmacy() {
  const [rows, setRows] =
    useState([]);

  useEffect(() => {
    api
      .get('/pharmacy/inventory')
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});
  }, []);

  return (
    <GenericPage
      title="Pharmacy & Inventory"
      subtitle="Stock, expiry and automated reorder recommendations"
    >
      <div className="page-cards">
        <Mini
          label="Medicines"
          value={
            rows.length || 50
          }
          change="Active SKUs"
        />

        <Mini
          label="Low Stock"
          value={
            rows.filter(
              x =>
                x.stock <=
                x.reorderLevel
            ).length || '—'
          }
          change="Needs review"
        />

        <Mini
          label="Expiry Alerts"
          value={
            rows.filter(
              x =>
                new Date(
                  x.expiryDate
                ) <
                new Date(
                  Date.now() +
                    60 *
                      86400000
                )
            ).length || '—'
          }
          change="Next 60 days"
        />
      </div>

      <Card title="Inventory">
        <DataTable
          rows={rows}
          columns={[
            ['name', 'Medicine'],
            [
              'category',
              'Category'
            ],
            ['stock', 'Stock'],
            [
              'reorderLevel',
              'Reorder At'
            ],
            [
              'expiryDate',
              'Expiry'
            ],
            [
              'consumed30d',
              '30d Use'
            ]
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Quality() {
  const [rows, setRows] =
    useState([]);

  useEffect(() => {
    api
      .get('/quality/incidents')
      .then(r =>
        setRows(r.data)
      )
      .catch(() => {});
  }, []);

  return (
    <GenericPage
      title="Quality & Compliance"
      subtitle="Incidents, compliance and audit visibility"
    >
      <div className="page-cards">
        <Mini
          label="Medication SOP"
          value="96%"
          change="Compliant"
        />

        <Mini
          label="Patient Identification"
          value="94%"
          change="Compliant"
        />

        <Mini
          label="Hand Hygiene"
          value="97%"
          change="Compliant"
        />
      </div>

      <Card title="Incident Tracker">
        <DataTable
          rows={rows}
          columns={[
            ['incidentId', 'ID'],
            ['type', 'Type'],
            [
              'severity',
              'Severity'
            ],
            [
              'department',
              'Department'
            ],
            ['status', 'Status']
          ]}
        />
      </Card>
    </GenericPage>
  );
}

function Copilot() {
  return (
    <GenericPage
      title="AI Medical Operations Copilot"
      subtitle="Ask operational questions using the dashboard dataset"
    >
      <div className="copilot-page">
        <CopilotBox />
      </div>
    </GenericPage>
  );
}

function SettingsPage() {
  return (
    <GenericPage
      title="Settings"
      subtitle="Dashboard preferences and profile"
    >
      <Card title="Administrator Profile">
        <div className="settings-row">
          <span>Name</span>
          <b>Gandhe Varshitha</b>
        </div>

        <div className="settings-row">
          <span>Email</span>
          <b>
            admin@medops.local
          </b>
        </div>

        <div className="settings-row">
          <span>Role</span>
          <b>Administrator</b>
        </div>

        <button
          className="primary"
          onClick={() =>
            alert(
              'Profile settings saved for this demo.'
            )
          }
        >
          Save Changes
        </button>
      </Card>
    </GenericPage>
  );
}

function DataTable({
  rows,
  columns
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c[0]}>
                {c[1]}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr
                key={
                  r._id || i
                }
              >
                {columns.map(c => (
                  <td key={c[0]}>
                    {String(
                      r[c[0]] ?? '—'
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={
                  columns.length
                }
                className="empty"
              >
                No records available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;