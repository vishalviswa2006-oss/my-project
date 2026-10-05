const MOTIVATIONAL_TIPS = [
  'Small steps every day build a stronger future.',
  'A healthy routine starts with one simple task.',
  'Your consistency matters more than perfection.',
  'Focus on progress, not pressure.',
  'Finish the next small win and keep momentum moving.'
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const renderTip = () => {
  const tipElement = document.getElementById('motivationalTip');
  if (!tipElement) return;
  const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_TIPS.length);
  tipElement.textContent = MOTIVATIONAL_TIPS[randomIndex];
};

const setUserProfile = (user) => {
  const userNameNode = document.getElementById('userName');
  const userEmailNode = document.getElementById('userEmail');
  const memberSinceNode = document.getElementById('memberSince');
  const userInitialsNode = document.getElementById('userInitials');

  if (!user) return;

  if (userNameNode) userNameNode.textContent = user.name || 'User';
  if (userEmailNode) userEmailNode.textContent = user.email || 'N/A';
  if (memberSinceNode) memberSinceNode.textContent = formatDate(user.created_at || user.createdAt);
  if (userInitialsNode) userInitialsNode.textContent = getInitials(user.name);
};

const renderStats = (summary) => {
  const progressValue = document.getElementById('todayProgressValue');
  const progressText = document.getElementById('todayProgressText');
  const streakValue = document.getElementById('streakValue');
  const totalHabitsValue = document.getElementById('totalHabitsValue');
  const completedHabitsValue = document.getElementById('completedHabitsValue');
  const completedLabel = document.getElementById('completedLabel');

  if (!summary) return;

  if (progressValue) progressValue.textContent = `${summary.progress}%`;
  if (progressText) progressText.textContent = `${summary.completedToday} / ${summary.totalHabits} done`;
  if (streakValue) streakValue.textContent = `${summary.streak} day${summary.streak === 1 ? '' : 's'}`;
  if (totalHabitsValue) totalHabitsValue.textContent = summary.totalHabits;
  if (completedHabitsValue) completedHabitsValue.textContent = summary.totalCompleted;
  if (completedLabel) completedLabel.textContent = 'All-time';
};

const renderHabits = (habits) => {
  const habitList = document.getElementById('habitList');
  if (!habitList) return;

  if (!habits || habits.length === 0) {
    habitList.innerHTML = `
      <div class="empty-state">
        <p>No habits yet. Add your first habit to start building momentum.</p>
      </div>
    `;
    return;
  }

  habitList.innerHTML = habits
    .map(
      (habit) => `
        <div class="habit-item ${habit.isCompletedToday ? 'completed' : ''}" data-id="${habit.id}">
          <div class="habit-main">
            <div class="habit-check" aria-label="Habit completion"></div>
            <div>
              <div class="habit-name">${habit.name}</div>
              <div class="habit-meta">
                <span>Created ${formatDate(habit.createdAt)}</span>
                <span>•</span>
                <span>${habit.totalCompletions} completions</span>
              </div>
            </div>
          </div>

          <div class="habit-actions">
            <button type="button" class="icon-btn toggle" data-action="toggle" data-id="${habit.id}">
              ${habit.isCompletedToday ? 'Unmark' : 'Mark done'}
            </button>
            <button type="button" class="icon-btn edit" data-action="edit" data-id="${habit.id}">Edit</button>
            <button type="button" class="icon-btn delete" data-action="delete" data-id="${habit.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
};

const bindHabitEvents = () => {
  const habitList = document.getElementById('habitList');
  const habitForm = document.getElementById('habitForm');
  const habitInput = document.getElementById('habitInput');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  if (!habitList || !habitForm) return;

  habitList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;

    if (action === 'toggle') {
      await toggleHabit(id);
    }

    if (action === 'delete') {
      const confirmed = window.confirm('Delete this habit permanently?');
      if (confirmed) {
        await deleteHabit(id);
      }
    }

    if (action === 'edit') {
      const targetHabit = currentHabits.find((habit) => String(habit.id) === String(id));
      if (!targetHabit) return;

      habitInput.value = targetHabit.name;
      habitInput.focus();
      habitForm.dataset.editId = id;
      cancelEditBtn?.classList.remove('hidden');
    }
  });

  habitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = habitInput.value.trim();
    if (!name) return;

    const editId = habitForm.dataset.editId;

    if (editId) {
      await updateHabit(editId, name);
      delete habitForm.dataset.editId;
      cancelEditBtn?.classList.add('hidden');
    } else {
      await addHabit(name);
    }

    habitInput.value = '';
  });

  cancelEditBtn?.addEventListener('click', () => {
    delete habitForm.dataset.editId;
    habitInput.value = '';
    cancelEditBtn.classList.add('hidden');
    habitInput.focus();
  });
};

let currentHabits = [];

async function fetchDashboardData() {
  try {
    const [profileResponse, summaryResponse, habitsResponse] = await Promise.all([
      fetch('/api/auth/me', { headers: getAuthHeaders() }),
      fetch('/api/habits/summary', { headers: getAuthHeaders() }),
      fetch('/api/habits', { headers: getAuthHeaders() })
    ]);

    if (!profileResponse.ok || !summaryResponse.ok || !habitsResponse.ok) {
      throw new Error('Unable to load dashboard data');
    }

    const profileData = await profileResponse.json();
    const summaryData = await summaryResponse.json();
    const habitsData = await habitsResponse.json();

    setUserProfile(profileData.user);
    renderStats(summaryData);
    currentHabits = habitsData.habits || [];
    renderHabits(currentHabits);
  } catch (error) {
    console.error(error);
    window.location.href = '/login.html';
  }
}

async function addHabit(name) {
  try {
    const response = await fetch('/api/habits', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ habitName: name })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not add habit.');
    await fetchDashboardData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function updateHabit(id, name) {
  try {
    const response = await fetch(`/api/habits/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ habitName: name })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not update habit.');
    await fetchDashboardData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteHabit(id) {
  try {
    const response = await fetch(`/api/habits/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not delete habit.');
    await fetchDashboardData();
  } catch (error) {
    window.alert(error.message);
  }
}

async function toggleHabit(id) {
  try {
    const response = await fetch(`/api/habits/${id}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not update habit status.');
    await fetchDashboardData();
  } catch (error) {
    window.alert(error.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  renderTip();
  bindHabitEvents();

  const dashboardApp = document.getElementById('dashboardApp');
  if (dashboardApp) {
    await fetchDashboardData();
  }
});
