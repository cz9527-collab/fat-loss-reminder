const STORAGE_KEY = "fat-loss-reminder-state-v1";

const defaultTasks = [
  {
    id: "breakfast",
    tag: "早餐",
    title: "茶叶蛋 2 个",
    detail: "加苹果或无糖酸奶，先稳住上午状态",
  },
  {
    id: "lunch",
    tag: "午餐",
    title: "米饭 1 拳 + 肉 1 掌",
    detail: "公司饭照常吃，蔬菜尽量多一点",
  },
  {
    id: "dinner",
    tag: "晚餐",
    title: "鸡胸肉 + 大碗蔬菜",
    detail: "不吃米饭、面、奶茶和零食",
  },
  {
    id: "eveningMove",
    tag: "轻运动",
    title: "上下蹲 + 平板支撑",
    detail: "做 8-12 分钟，微微出汗就好",
  },
  {
    id: "steps",
    tag: "步数",
    title: "步数达到 8000",
    detail: "没到也别焦虑，晚上补一点活动量",
  },
];

const defaultReminders = [
  {
    id: "breakfast",
    title: "早餐提醒",
    detail: "茶叶蛋 2 个 + 苹果/无糖酸奶",
    time: "08:00",
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "lunch",
    title: "午餐提醒",
    detail: "米饭 1 拳 + 肉 1 掌 + 多吃菜",
    time: "12:00",
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "middayMove",
    title: "午间轻活动",
    detail: "可选：站 3 分钟或慢走 5 分钟",
    time: "13:00",
    enabled: false,
    days: [1, 2, 3, 4, 5],
  },
  {
    id: "dinner",
    title: "晚餐提醒",
    detail: "鸡胸肉 + 大碗蔬菜，今晚不吃主食零食",
    time: "18:30",
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "eveningMove",
    title: "晚间轻运动",
    detail: "上下蹲、平板支撑或拉伸 8-12 分钟",
    time: "19:10",
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "steps",
    title: "步数检查",
    detail: "步数是否达到 8000？差一点就补点轻运动",
    time: "21:00",
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "freeMeal",
    title: "自由餐提醒",
    detail: "不暴食，不喝含糖饮料，不连续放飞",
    time: "12:00",
    enabled: true,
    days: [6],
  },
];

let state = loadState();
let timers = [];
let swRegistration = null;

function todayKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function migrateCompleted(completed = {}) {
  if (completed.eveningWalk && !completed.eveningMove) {
    completed.eveningMove = completed.eveningWalk;
    delete completed.eveningWalk;
  }
  return completed;
}

function migrateReminder(reminder) {
  return reminder?.id === "eveningWalk" ? { ...reminder, id: "eveningMove" } : reminder;
}

function loadState() {
  const fallback = {
    date: todayKey(),
    completed: {},
    reminders: defaultReminders,
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) return fallback;

    const savedReminders = (parsed.reminders || []).map(migrateReminder);
    const mergedReminders = defaultReminders.map((item) => {
      const saved = savedReminders.find((entry) => entry.id === item.id);
      return {
        ...item,
        time: saved?.time || item.time,
        enabled: typeof saved?.enabled === "boolean" ? saved.enabled : item.enabled,
        days: saved?.days || item.days,
      };
    });

    return {
      date: parsed.date || todayKey(),
      completed: parsed.date === todayKey() ? migrateCompleted(parsed.completed || {}) : {},
      reminders: mergedReminders,
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureToday() {
  if (state.date !== todayKey()) {
    state.date = todayKey();
    state.completed = {};
    saveState();
  }
}

function renderDate() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  document.querySelector("#todayLabel").textContent = formatter.format(new Date());
}

function renderTasks() {
  ensureToday();
  const taskList = document.querySelector("#taskList");
  const template = document.querySelector("#taskTemplate");
  taskList.textContent = "";

  defaultTasks.forEach((task) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const input = node.querySelector("input");
    input.checked = Boolean(state.completed[task.id]);
    node.querySelector(".task-meta").textContent = task.tag;
    node.querySelector("strong").textContent = task.title;
    node.querySelector("small").textContent = task.detail;
    input.addEventListener("change", () => {
      state.completed[task.id] = input.checked;
      saveState();
      renderProgress();
    });
    taskList.appendChild(node);
  });

  renderProgress();
}

function renderProgress() {
  const done = defaultTasks.filter((task) => state.completed[task.id]).length;
  const total = defaultTasks.length;
  const percent = Math.round((done / total) * 100);
  document.querySelector("#progressText").textContent = `${done}/${total} 已完成`;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector(".progress-ring").style.setProperty("--progress", `${percent}%`);

  const mood =
    done === total
      ? "今天稳了"
      : percent >= 80
        ? "80% 达成，很可以"
        : done >= 2
          ? "节奏已经起来了"
          : "先完成早餐";
  document.querySelector("#progressMood").textContent = mood;
}

function renderReminders() {
  const reminderList = document.querySelector("#reminderList");
  const template = document.querySelector("#reminderTemplate");
  reminderList.textContent = "";

  state.reminders.forEach((reminder) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const toggle = node.querySelector(".switch input");
    const timeInput = node.querySelector(".time-input");
    toggle.checked = reminder.enabled;
    timeInput.value = reminder.time;
    node.querySelector("strong").textContent = reminder.title;
    node.querySelector("small").textContent = reminder.detail;

    toggle.addEventListener("change", () => {
      reminder.enabled = toggle.checked;
      saveState();
      scheduleReminders();
    });

    timeInput.addEventListener("change", () => {
      reminder.time = timeInput.value || reminder.time;
      saveState();
      scheduleReminders();
    });

    reminderList.appendChild(node);
  });
}

function updateNotifyStatus() {
  const status = document.querySelector("#notifyStatus");
  if (!("Notification" in window)) {
    status.textContent = "不支持";
    return;
  }

  const label = {
    granted: "已开启",
    denied: "已拒绝",
    default: "未开启",
  };
  status.textContent = label[Notification.permission] || "未开启";
}

async function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    swRegistration = await navigator.serviceWorker.register("./sw.js");
  }
}

async function askNotifications() {
  if (!("Notification" in window)) {
    alert("当前浏览器不支持通知。");
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotifyStatus();
  if (permission === "granted") {
    scheduleReminders();
    sendNotification("减脂提醒已开启", "中午活动默认不强制，晚间轻运动会提醒你。");
  }
}

function nextReminderDate(reminder, now = new Date()) {
  const [hour, minute] = reminder.time.split(":").map(Number);

  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hour, minute, 0, 0);
    if (reminder.days.includes(candidate.getDay()) && candidate > now) {
      return candidate;
    }
  }

  return null;
}

function scheduleReminders() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  state.reminders
    .filter((reminder) => reminder.enabled)
    .forEach((reminder) => {
      const nextDate = nextReminderDate(reminder);
      if (!nextDate) return;

      const delay = nextDate.getTime() - Date.now();
      const timer = window.setTimeout(() => {
        sendNotification(reminder.title, reminder.detail);
        scheduleReminders();
      }, delay);
      timers.push(timer);
    });
}

function sendNotification(title, body) {
  const options = {
    body,
    icon: "./assets/icon.svg",
    badge: "./assets/icon.svg",
    tag: `fat-loss-${title}`,
  };

  if (swRegistration?.showNotification) {
    swRegistration.showNotification(title, options);
    return;
  }

  new Notification(title, options);
}

function bindActions() {
  document.querySelector("#notifyButton").addEventListener("click", askNotifications);
  document.querySelector("#resetButton").addEventListener("click", () => {
    state.completed = {};
    saveState();
    renderTasks();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      ensureToday();
      renderTasks();
      scheduleReminders();
    }
  });
}

async function boot() {
  renderDate();
  renderTasks();
  renderReminders();
  bindActions();
  updateNotifyStatus();
  await initServiceWorker();
  scheduleReminders();
}

boot();
