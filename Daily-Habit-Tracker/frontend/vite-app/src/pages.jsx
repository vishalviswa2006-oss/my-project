import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import api, { getErrorMessage } from './api';
import { useAuth } from './auth';

const categories = ['Health', 'Fitness', 'Mindfulness', 'Learning', 'Productivity', 'Personal', 'Other'];
const frequencies = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Once a week' }
];

const dayCount = (count) => `${count} ${count === 1 ? 'day' : 'days'}`;
const checkInCount = (count) => `${count} completed ${count === 1 ? 'check-in' : 'check-ins'}`;

function StatCard({ label, value, note, tone = 'mint', icon }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
      <strong>{value}</strong>
      <span className="stat-note">{note}</span>
    </article>
  );
}

function ProgressRing({ value = 0, label = 'of your day' }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="ring-wrap">
      <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` }}>
        <div className="ring-center"><strong>{percent}%</strong><span>{label}</span></div>
      </div>
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">✳</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function HabitRow({ habit, onToggle, onEdit, onDelete, compact = false }) {
  const frequency = frequencies.find((item) => item.value === habit.frequency)?.label || 'Every day';
  return (
    <article className={`habit-row ${habit.isCompletedToday ? 'habit-done' : ''} ${compact ? 'habit-compact' : ''}`}>
      <button
        className={`habit-check ${habit.isCompletedToday ? 'checked' : ''}`}
        onClick={() => onToggle(habit)}
        disabled={!habit.isDueToday && !habit.isCompletedToday}
        aria-label={`${habit.isCompletedToday ? 'Mark incomplete' : 'Complete'} ${habit.name}`}
        title={!habit.isDueToday && !habit.isCompletedToday ? 'Not due today' : ''}
      >{habit.isCompletedToday ? '✓' : ''}</button>
      <div className="habit-info">
        <div className="habit-title-line"><h3>{habit.name}</h3><span className="category-tag">{habit.category}</span></div>
        {!compact && habit.description && <p className="habit-description">{habit.description}</p>}
        <div className="habit-meta"><span>{frequency}</span><span className="meta-dot">·</span><span>{habit.totalCompletions} {habit.totalCompletions === 1 ? 'completion' : 'completions'}</span></div>
      </div>
      {compact ? (
        <span className={`task-status ${habit.isCompletedToday || (habit.frequency === 'weekly' && habit.isCompletedThisWeek) ? 'status-done' : ''}`}>
          {habit.isCompletedToday ? 'Done' : habit.frequency === 'weekly' && habit.isCompletedThisWeek ? 'Done this week' : habit.isDueToday ? 'Today' : 'Later'}
        </span>
      ) : (
        <div className="habit-actions">
          <button className="icon-button" onClick={() => onEdit(habit)} title="Edit habit" aria-label={`Edit ${habit.name}`}>✎</button>
          <button className="icon-button danger-icon" onClick={() => onDelete(habit)} title="Delete habit" aria-label={`Delete ${habit.name}`}>×</button>
        </div>
      )}
    </article>
  );
}

function HabitForm({ initial = null, onSubmit, onCancel, busy }) {
  const [values, setValues] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    category: initial?.category || 'Personal',
    frequency: initial?.frequency || 'daily'
  });
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form
      className="habit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <label className="field field-wide"><span>Habit name</span><input name="name" value={values.name} onChange={change} maxLength="100" placeholder="e.g. Read for 20 minutes" required autoFocus /></label>
      <label className="field field-wide"><span>A little detail <small>Optional</small></span><input name="description" value={values.description} onChange={change} maxLength="500" placeholder="What does this habit look like for you?" /></label>
      <label className="field"><span>Category</span><select name="category" value={values.category} onChange={change}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span>Repeat</span><select name="frequency" value={values.frequency} onChange={change}>{frequencies.map((frequency) => <option key={frequency.value} value={frequency.value}>{frequency.label}</option>)}</select></label>
      <div className="form-actions field-wide">
        <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add habit'}</button>
      </div>
    </form>
  );
}

function useTracker() {
  return useOutletContext();
}

export function DashboardPage() {
  const { user } = useAuth();
  const { habits, stats, loading, refreshData } = useTracker();
  const [actionError, setActionError] = useState('');
  const todayHabits = habits.filter((habit) => habit.isDueToday || habit.isCompletedToday);

  const toggleHabit = async (habit) => {
    setActionError('');
    try {
      await api.post(`/progress/${habit.id}/toggle`);
      await refreshData();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><p className="overline">A LITTLE BETTER, EVERY DAY</p><h1>Good to see you, {user?.name?.split(' ')[0] || 'friend'} <span>✺</span></h1><p className="welcome-subtitle">A few small promises to yourself can change everything.</p></div>
        <Link to="/habits" className="button button-primary">＋ <span>Manage habits</span></Link>
      </section>
      <section className="stats-grid" aria-label="Your habit stats">
        <StatCard label="Today's progress" value={`${stats?.completionPercentage ?? 0}%`} note={`${stats?.completedToday ?? 0} of ${stats?.todayTotal ?? 0} habits complete`} tone="mint" icon="◉" />
        <StatCard label="Current streak" value={dayCount(stats?.currentStreak ?? 0)} note="Keep your rhythm going" tone="peach" icon="↗" />
        <StatCard label="Longest streak" value={dayCount(stats?.longestStreak ?? 0)} note="Your personal best" tone="lavender" icon="✳" />
        <StatCard label="Weekly consistency" value={`${stats?.weeklyPercentage ?? 0}%`} note={`${stats?.weeklyDone ?? 0} of ${stats?.weeklyGoal ?? 0} weekly check-ins`} tone="blue" icon="▦" />
      </section>

      {actionError && <div className="notice notice-error" role="alert">{actionError}</div>}
      <div className="dashboard-grid">
        <section className="panel today-panel">
          <div className="section-heading"><div><p className="overline">SHOW UP FOR YOURSELF</p><h2>Today's habits</h2></div><span className="count-pill">{todayHabits.filter((habit) => habit.isCompletedToday).length}/{todayHabits.length}</span></div>
          {loading ? <div className="inline-loading"><span className="spinner" />Loading today's habits…</div>
            : todayHabits.length ? <div className="habit-list">{todayHabits.map((habit) => <HabitRow key={habit.id} habit={habit} compact onToggle={toggleHabit} />)}</div>
              : <EmptyState title="A fresh start" text="Add one small habit and make today count." action={<Link className="button button-primary button-small" to="/habits">Create your first habit</Link>} />}
          {todayHabits.length > 0 && <Link className="subtle-link" to="/habits">See all habits <span>→</span></Link>}
        </section>

        <section className="panel focus-panel">
          <div className="section-heading"><div><p className="overline">YOUR DAY AT A GLANCE</p><h2>Today's rhythm</h2></div></div>
          <ProgressRing value={stats?.completionPercentage} />
          <div className="ring-caption"><strong>{stats?.completedToday ?? 0} down, {Math.max(0, (stats?.todayTotal ?? 0) - (stats?.completedToday ?? 0))} to go</strong><span>Every check-in is a win.</span></div>
          <div className="focus-divider" />
          <div className="focus-footer"><span className="sparkle">✦</span><p>Consistency is built in the ordinary moments.</p></div>
        </section>
      </div>
    </div>
  );
}

export function HabitsPage() {
  const { habits, loading, refreshData } = useTracker();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const saveHabit = async (values) => {
    setBusy(true);
    setError('');
    try {
      if (editing) await api.put(`/habits/${editing.id}`, values);
      else await api.post('/habits', values);
      setEditing(null);
      setShowForm(false);
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save this habit.'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (habit) => {
    setEditing(habit);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const deleteHabit = async (habit) => {
    if (!window.confirm(`Delete "${habit.name}" and its progress history?`)) return;
    setError('');
    try {
      await api.delete(`/habits/${habit.id}`);
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not delete this habit.'));
    }
  };

  const toggleHabit = async (habit) => {
    setError('');
    try {
      await api.post(`/progress/${habit.id}/toggle`);
      await refreshData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro-row"><div><p className="overline">YOUR PERSONAL ROUTINE</p><h1>My habits</h1><p className="welcome-subtitle">Little by little, a little becomes a lot.</p></div><button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true); setError(''); }}>＋ <span>New habit</span></button></section>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {showForm && <section className="panel form-panel"><div className="section-heading"><div><p className="overline">{editing ? 'TUNE YOUR ROUTINE' : 'START SMALL'}</p><h2>{editing ? 'Edit habit' : 'Create a habit'}</h2></div><button className="icon-button close-button" aria-label="Close form" onClick={closeForm}>×</button></div><HabitForm key={editing?.id || 'new'} initial={editing} onSubmit={saveHabit} onCancel={closeForm} busy={busy} /></section>}
      <section className="panel habits-panel">
        <div className="section-heading"><div><p className="overline">ONE DAY AT A TIME</p><h2>Your routine <span className="heading-count">{habits.length}</span></h2></div></div>
        {loading ? <div className="inline-loading"><span className="spinner" />Loading your habits…</div>
          : habits.length ? <div className="habit-list">{habits.map((habit) => <HabitRow key={habit.id} habit={habit} onToggle={toggleHabit} onEdit={startEdit} onDelete={deleteHabit} />)}</div>
            : <EmptyState title="Your habit list is ready" text="Choose one simple action you can repeat. You can always add more later." action={<button className="button button-primary button-small" onClick={() => setShowForm(true)}>Add your first habit</button>} />}
      </section>
    </div>
  );
}

export function ProgressPage() {
  const { stats, loading } = useTracker();
  const days = stats?.weeklyProgress || [];
  return (
    <div className="page-stack">
      <section className="page-intro-row"><div><p className="overline">NOTICE HOW FAR YOU'VE COME</p><h1>Your progress</h1><p className="welcome-subtitle">Progress isn't always loud. Sometimes it's just showing up again.</p></div></section>
      <section className="stats-grid">
        <StatCard label="This week's progress" value={`${stats?.weeklyPercentage ?? 0}%`} note={checkInCount(stats?.weeklyDone ?? 0)} tone="mint" icon="◉" />
        <StatCard label="Current streak" value={dayCount(stats?.currentStreak ?? 0)} note="Consecutive days with a check-in" tone="peach" icon="↗" />
        <StatCard label="Longest streak" value={dayCount(stats?.longestStreak ?? 0)} note="A record worth celebrating" tone="lavender" icon="✳" />
        <StatCard label="All-time check-ins" value={stats?.allTimeCompletions ?? '—'} note={`${stats?.totalHabits ?? 0} habits in your routine`} tone="blue" icon="▦" />
      </section>
      <section className="panel chart-panel">
        <div className="section-heading"><div><p className="overline">THE LAST SEVEN DAYS</p><h2>Your weekly rhythm</h2></div><span className="chart-legend"><i /> Completed habits</span></div>
        {loading ? <div className="inline-loading"><span className="spinner" />Gathering your progress…</div>
          : days.length ? <div className="week-chart">{days.map((day) => {
            const percentage = day.total ? Math.min(100, Math.round((day.completed / day.total) * 100)) : 0;
            return <div className="chart-day" key={day.date}><span className="chart-count">{day.completed || ''}</span><div className="chart-track"><div className="chart-bar" style={{ height: `${Math.max(percentage ? 7 : 0, percentage)}%` }} /></div><span className="chart-label">{day.label}</span></div>;
          })}</div> : <EmptyState title="Your next chapter starts today" text="Complete a habit to begin filling in your weekly rhythm." />}
        <p className="chart-caption">{stats?.weeklyDone ?? 0} {`check-in${stats?.weeklyDone === 1 ? '' : 's'}`} this week · {stats?.weeklyGoal ?? 0} planned</p>
      </section>
      <section className="encouragement-card"><span className="encouragement-icon">✦</span><div><p className="overline">A NOTE TO YOURSELF</p><h2>You're becoming someone who shows up.</h2><p>Each small action is evidence that you can trust yourself. Keep collecting it.</p></div></section>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [createdAt, setCreatedAt] = useState(user?.created_at || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/user/profile')
      .then(({ data }) => {
        setForm((current) => ({ ...current, name: data.user.name, email: data.user.email }));
        setCreatedAt(data.user.created_at);
      })
      .catch((requestError) => setError(getErrorMessage(requestError, 'Could not load your profile.')));
  }, []);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put('/user/profile', form);
      updateUser(data.user);
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      setSuccess('Your profile has been updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save your changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro-row"><div><p className="overline">MAKE YOURSELF AT HOME</p><h1>Your profile</h1><p className="welcome-subtitle">The person behind the progress.</p></div></section>
      <div className="profile-layout">
        <section className="panel profile-card">
          <div className="profile-avatar">{form.name.trim().charAt(0).toUpperCase() || 'U'}</div>
          <h2>{form.name || 'Your name'}</h2><p>{form.email}</p>
          <span className="member-chip">✦ &nbsp; {createdAt ? `Here since ${new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(createdAt))}` : 'Your personal space'}</span>
        </section>
        <section className="panel profile-form-panel">
          <div className="section-heading"><div><p className="overline">ACCOUNT DETAILS</p><h2>Edit your profile</h2></div></div>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {success && <div className="notice notice-success" role="status">{success}</div>}
          <form className="profile-form" onSubmit={submit}>
            <label className="field"><span>Your name</span><input name="name" value={form.name} onChange={update} maxLength="100" required /></label>
            <label className="field"><span>Email address</span><input type="email" name="email" value={form.email} onChange={update} required /></label>
            <div className="password-divider"><span>Change password</span><small>Leave blank to keep your current password</small></div>
            <label className="field"><span>Current password</span><input type="password" name="currentPassword" value={form.currentPassword} onChange={update} autoComplete="current-password" /></label>
            <label className="field"><span>New password</span><input type="password" name="newPassword" value={form.newPassword} onChange={update} minLength="8" autoComplete="new-password" /></label>
            <button className="button button-primary profile-save" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function AuthFrame({ eyebrow, title, subtitle, children, footer }) {
  return (
    <main className="auth-shell">
      <section className="auth-decoration"><Link className="brand auth-brand" to="/"><span className="brand-icon">d<span>.</span></span><span>daily<span className="brand-muted">habits</span></span></Link><div className="auth-quote"><span className="auth-sparkle">✳</span><h2>Small steps.<br />A softer kind of progress.</h2><p>You don't have to do it all. Just the next small thing.</p><div className="decor-dots"><i /><i /><i /><i /><i /></div></div><span className="auth-decoration-footer">MADE FOR YOUR EVERYDAY ✦</span></section>
      <section className="auth-main"><div className="auth-content"><p className="overline">{eyebrow}</p><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}<p className="auth-footer">{footer}</p></div></section>
    </main>
  );
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      signIn(data);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not sign you in.'));
    } finally {
      setLoading(false);
    }
  };

  return <AuthFrame eyebrow="WELCOME BACK" title="Good to have you here." subtitle="Pick up right where you left off." footer={<>New to Daily Habits? <Link to="/register">Create an account <span>→</span></Link></>}>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label className="field"><span>Email address</span><input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" autoComplete="email" required /></label>
      <label className="field"><span>Password</span><input type="password" name="password" value={form.password} onChange={update} placeholder="Your password" autoComplete="current-password" required /></label>
      <button className="button button-primary auth-submit" disabled={loading}>{loading ? 'Signing you in…' : 'Sign in'} <span>→</span></button>
    </form>
  </AuthFrame>;
}

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', form);
      signIn(data);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not create your account.'));
    } finally {
      setLoading(false);
    }
  };

  return <AuthFrame eyebrow="A FRESH START" title="Make room for better." subtitle="Your next small step starts right here." footer={<>Already have an account? <Link to="/login">Sign in <span>→</span></Link></>}>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label className="field"><span>Your name</span><input name="name" value={form.name} onChange={update} placeholder="How should we call you?" maxLength="100" autoComplete="name" required /></label>
      <label className="field"><span>Email address</span><input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" autoComplete="email" required /></label>
      <label className="field"><span>Create a password</span><input type="password" name="password" value={form.password} onChange={update} placeholder="At least 8 characters" minLength="8" autoComplete="new-password" required /></label>
      <button className="button button-primary auth-submit" disabled={loading}>{loading ? 'Creating your space…' : 'Create my account'} <span>→</span></button>
    </form>
  </AuthFrame>;
}
