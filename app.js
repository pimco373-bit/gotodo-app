const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "gotodo.tasks";

const els = {
  monthTitle: document.getElementById("month-title"),
  weekdayRow: document.getElementById("weekday-row"),
  calendarGrid: document.getElementById("calendar-grid"),
  selectedLabel: document.getElementById("selected-label"),
  selectedDate: document.getElementById("selected-date"),
  taskCount: document.getElementById("task-count"),
  taskList: document.getElementById("task-list"),
  addForm: document.getElementById("add-form"),
  titleInput: document.getElementById("task-title"),
  prioritySelect: document.getElementById("task-priority"),
  jumpToday: document.getElementById("jump-today"),
  prevMonth: document.getElementById("prev-month"),
  nextMonth: document.getElementById("next-month"),
  todayRemain: document.getElementById("today-remain"),
};

const state = {
  view: startOfMonth(new Date()),
  selected: startOfDay(new Date()),
  tasks: loadTasks(),
};

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function tasksFor(date) {
  const key = dateKey(date);
  return state.tasks.filter((task) => task.date === key);
}

function openCountFor(date) {
  return tasksFor(date).filter((task) => !task.done).length;
}

function formatKoreanDate(date) {
  const weekday = WEEKDAYS[date.getDay()];
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")} ${weekday}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderWeekdays() {
  els.weekdayRow.innerHTML = WEEKDAYS.map(
    (day) => `<div class="weekday">${day}</div>`
  ).join("");
}

function renderTodayRemain() {
  const open = openCountFor(startOfDay(new Date()));
  els.todayRemain.textContent = open === 0 ? "오늘 할 일 없음" : `오늘 남은 일 ${open}`;
}

function renderCalendar() {
  const year = state.view.getFullYear();
  const month = state.view.getMonth();
  const today = startOfDay(new Date());

  els.monthTitle.textContent = `${year}. ${String(month + 1).padStart(2, "0")}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push(`<div class="day empty"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dayTasks = tasksFor(date);
    const hasUrgent = dayTasks.some((task) => !task.done && task.priority === "urgent");
    const openCount = dayTasks.filter((task) => !task.done).length;
    const classes = ["day"];
    if (isSameDay(date, today)) classes.push("today");
    if (isSameDay(date, state.selected)) classes.push("selected");

    let meta = "";
    if (openCount > 0) {
      const dotClass = hasUrgent ? "dot urgent" : "dot";
      meta = `
        <span class="day-meta">
          <span class="dots"><span class="${dotClass}"></span></span>
          <span class="open-count">${openCount}</span>
        </span>
      `;
    }

    const todayAttr = isSameDay(date, today) ? ' aria-current="date"' : "";

    cells.push(`
      <button type="button" class="${classes.join(" ")}" data-date="${dateKey(date)}"${todayAttr}>
        <span class="day-num">${day}</span>
        ${meta}
      </button>
    `);
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = 0; i < 7 - remainder; i += 1) {
      cells.push(`<div class="day empty"></div>`);
    }
  }

  els.calendarGrid.innerHTML = cells.join("");
}

function renderTasks() {
  const today = startOfDay(new Date());
  const selectedTasks = tasksFor(state.selected);
  const openCount = selectedTasks.filter((task) => !task.done).length;

  els.selectedLabel.textContent = isSameDay(state.selected, today) ? "TODAY" : "SELECTED";
  els.selectedDate.textContent = formatKoreanDate(state.selected);
  els.taskCount.textContent =
    selectedTasks.length === 0 ? "할 일 없음" : `남은 일 ${openCount} / ${selectedTasks.length}`;

  if (selectedTasks.length === 0) {
    els.taskList.innerHTML = `<li class="empty-state">이 날의 할 일이 없습니다</li>`;
    return;
  }

  const ordered = [...selectedTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
    return a.createdAt - b.createdAt;
  });

  els.taskList.innerHTML = ordered
    .map((task) => {
      const classes = ["task"];
      if (task.done) classes.push("done");
      if (task.priority === "urgent") classes.push("urgent");
      const badge = task.priority === "urgent" ? "긴급" : "보통";
      return `
        <li class="${classes.join(" ")}">
          <button
            type="button"
            class="checkbox"
            role="checkbox"
            aria-checked="${task.done}"
            data-id="${task.id}"
            aria-label="${escapeHtml(task.title)} 완료"
          ></button>
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="badge ${task.priority === "urgent" ? "urgent" : ""}">${badge}</span>
        </li>
      `;
    })
    .join("");
}

function render() {
  renderCalendar();
  renderTasks();
  renderTodayRemain();
}

function selectDate(date) {
  state.selected = startOfDay(date);
  state.view = startOfMonth(date);
  render();
}

els.calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button.day");
  if (!button) return;
  const [year, month, day] = button.dataset.date.split("-").map(Number);
  state.selected = new Date(year, month - 1, day);
  render();
});

els.prevMonth.addEventListener("click", () => {
  state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1);
  renderCalendar();
});

els.nextMonth.addEventListener("click", () => {
  state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1);
  renderCalendar();
});

els.jumpToday.addEventListener("click", () => {
  selectDate(new Date());
});

els.addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = els.titleInput.value.trim();
  if (!title) return;

  state.tasks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    date: dateKey(state.selected),
    title,
    priority: els.prioritySelect.value,
    done: false,
    createdAt: Date.now(),
  });

  saveTasks();
  els.addForm.reset();
  els.prioritySelect.value = "normal";
  els.titleInput.focus();
  render();
});

els.taskList.addEventListener("click", (event) => {
  const checkbox = event.target.closest(".checkbox");
  if (!checkbox) return;
  const task = state.tasks.find((item) => item.id === checkbox.dataset.id);
  if (!task) return;
  task.done = !task.done;
  saveTasks();
  render();
});

renderWeekdays();
render();
