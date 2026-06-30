(function () {
  "use strict";

  const MODE = {
    FOCUS: "focus",
    SHORT: "short",
    LONG: "long"
  };

  const STATUS = {
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused"
  };

  const STORAGE = {
    SETTINGS: "studyflow_focus_settings",
    TASKS: "studyflow_focus_tasks",
    STATS: "studyflow_focus_stats",
    STREAK: "studyflow_focus_streak"
  };

  const DEFAULT_SETTINGS = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    dailyGoal: 4,
    autoStartNext: false,
    soundEnabled: true
  };

  const RING_RADIUS = 122;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const state = {
    mode: MODE.FOCUS,
    status: STATUS.IDLE,
    secondsLeft: DEFAULT_SETTINGS.focusDuration * 60,
    totalSeconds: DEFAULT_SETTINGS.focusDuration * 60,
    targetTime: null,
    tickId: null,
    autoStartTimeoutId: null,
    currentTaskId: null,
    settings: { ...DEFAULT_SETTINGS },
    tasks: [],
    todayStats: createEmptyStats(todayKey()),
    currentStreak: 0,
    lastActiveDate: ""
  };

  const dom = {};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    if (!window.StudyFlowApi?.requireAuth()) {
      return;
    }
    cacheDom();
    loadState();
    await hydrateUserShell();
    initializeTimerForMode(MODE.FOCUS);
    bindEvents();
    renderAll();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function cacheDom() {
    dom.modeButtons = $$("[data-mode]");
    dom.modeIndicator = $(".mode-indicator");
    dom.ringProgress = $("[data-ring-progress]");
    dom.modeLabel = $("[data-current-mode-label]");
    dom.sessionStatus = $("[data-session-status]");
    dom.nextModeLabel = $("[data-next-mode-label]");
    dom.sessionProgressLabel = $("[data-session-progress-label]");
    dom.cycleDots = $$("[data-cycle-dot]");
    dom.minTens = $("[data-min-tens]");
    dom.minOnes = $("[data-min-ones]");
    dom.secTens = $("[data-sec-tens]");
    dom.secOnes = $("[data-sec-ones]");
    dom.roundLabel = $("[data-round-label]");
    dom.timerGlow = $("[data-timer-glow]");
    dom.currentTaskCard = $("[data-current-task-card]");
    dom.currentTaskLabel = $("[data-current-task]");
    dom.startPauseButton = $("[data-start-pause]");
    dom.skipButton = $("[data-skip-session]");
    dom.resetButton = $("[data-reset-timer]");
    dom.taskSection = $(".task-section");
    dom.taskToggle = $("[data-toggle-tasks]");
    dom.taskForm = $("[data-task-form]");
    dom.taskTitle = $("[data-task-title]");
    dom.taskEstimate = $("[data-task-estimate]");
    dom.taskError = $("[data-task-error]");
    dom.taskList = $("[data-task-list]");
    dom.taskCount = $("[data-task-count]");
    dom.settingsOverlay = $("[data-settings-overlay]");
    dom.settingsOpen = $("[data-toggle-settings]");
    dom.settingsClose = $("[data-settings-close]");
    dom.settingsForm = $("[data-settings-form]");
    dom.settingFocus = $("[data-setting-focus]");
    dom.settingShort = $("[data-setting-short]");
    dom.settingLong = $("[data-setting-long]");
    dom.settingGoal = $("[data-setting-goal]");
    dom.settingAutoStart = $("[data-setting-auto-start]");
    dom.settingSound = $("[data-setting-sound]");
    dom.settingsError = $("[data-settings-error]");
    dom.historySummary = $("[data-history-summary]");
    dom.sessionHistory = $("[data-session-history]");
    dom.statsModal = $("[data-stats-modal]");
    dom.statsOpen = $("[data-toggle-stats]");
    dom.statsClose = $("[data-stats-close]");
    dom.completeModal = $("[data-complete-modal]");
    dom.modalClose = $("[data-modal-close]");
    dom.modalTitle = $("[data-modal-title]");
    dom.modalMessage = $("[data-modal-message]");
    dom.modalNext = $("[data-modal-next]");
  }

  async function hydrateUserShell() {
    if (!window.StudyFlowApi) {
      return;
    }
    window.StudyFlowApi.initAmbientMotion?.();
    const token = localStorage.getItem("studyflow_token");
    if (!token) {
      return;
    }
    try {
      await window.StudyFlowApi.initShell("dashboard");
    } catch (error) {
      return;
    }
  }

  function bindEvents() {
    dom.modeButtons.forEach((button) => {
      button.addEventListener("click", () => switchMode(button.dataset.mode));
    });

    dom.startPauseButton.addEventListener("click", handlePrimaryTimerAction);
    dom.skipButton.addEventListener("click", skipCurrentSession);
    dom.resetButton.addEventListener("click", resetCurrentTimer);
    dom.taskForm.addEventListener("submit", handleTaskSubmit);
    dom.taskToggle.addEventListener("click", () => dom.taskSection.classList.toggle("collapsed"));
    dom.settingsOpen.addEventListener("click", openSettings);
    dom.settingsClose.addEventListener("click", closeSettings);
    dom.settingsOverlay.addEventListener("click", (event) => {
      if (event.target === dom.settingsOverlay) {
        closeSettings();
      }
    });
    dom.settingsForm.addEventListener("submit", handleSettingsSubmit);
    dom.statsOpen.addEventListener("click", openStats);
    dom.statsClose.addEventListener("click", closeStats);
    dom.statsModal.addEventListener("click", (event) => {
      if (event.target === dom.statsModal) {
        closeStats();
      }
    });
    dom.modalClose.addEventListener("click", hideCompletionModal);
    dom.modalNext.addEventListener("click", () => {
      hideCompletionModal();
      startTimer();
    });

    document.addEventListener("keydown", handleKeyboardShortcuts);
    window.addEventListener("resize", () => window.requestAnimationFrame(updateModeIndicator));
  }

  function handleKeyboardShortcuts(event) {
    const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
    if (editing) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      handlePrimaryTimerAction();
      return;
    }
    if (event.code === "KeyR") {
      resetCurrentTimer();
      return;
    }
    if (event.code === "Escape") {
      if (!dom.completeModal.hidden) {
        hideCompletionModal();
        return;
      }
      if (!dom.settingsOverlay.hidden) {
        closeSettings();
        return;
      }
      if (!dom.statsModal.hidden) {
        closeStats();
        return;
      }
    }
  }

  function loadState() {
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...normalizeSettings(loadJson(STORAGE.SETTINGS, {}))
    };
    state.tasks = normalizeTasks(loadJson(STORAGE.TASKS, []));
    const currentTask = state.tasks.find((task) => task.isCurrent && !task.isCompleted);
    state.currentTaskId = currentTask ? currentTask.id : null;

    const allStats = loadJson(STORAGE.STATS, {});
    const key = todayKey();
    state.todayStats = normalizeStats(allStats[key], key);

    // Streak
    const streak = loadJson(STORAGE.STREAK, { currentStreak: 0, lastActiveDate: "" });
    state.currentStreak = streak.currentStreak || 0;
    state.lastActiveDate = streak.lastActiveDate || "";
  }

  function initializeTimerForMode(mode) {
    clearAutoStart();
    state.mode = mode;
    state.status = STATUS.IDLE;
    state.totalSeconds = getDurationSeconds(mode);
    state.secondsLeft = state.totalSeconds;
    state.targetTime = null;
    stopTicking();
  }

  function handlePrimaryTimerAction() {
    if (state.status === STATUS.RUNNING) {
      pauseTimer();
      return;
    }
    startTimer();
  }

  function startTimer() {
    clearAutoStart();
    if (state.secondsLeft <= 0) {
      resetCurrentTimer();
    }
    state.status = STATUS.RUNNING;
    state.targetTime = Date.now() + state.secondsLeft * 1000;
    startTicking();
    renderTimerState();
    requestBrowserNotificationPermission();
  }

  function pauseTimer() {
    if (state.status !== STATUS.RUNNING) {
      return;
    }
    syncRemainingTime();
    state.status = STATUS.PAUSED;
    state.targetTime = null;
    stopTicking();
    renderTimerState();
  }

  function resetCurrentTimer() {
    initializeTimerForMode(state.mode);
    renderTimerState();
  }

  function switchMode(nextMode) {
    if (!Object.values(MODE).includes(nextMode) || nextMode === state.mode) {
      return;
    }
    initializeTimerForMode(nextMode);
    renderAll();
  }

  function startTicking() {
    stopTicking();
    state.tickId = window.setInterval(tick, 250);
    tick();
  }

  function stopTicking() {
    if (state.tickId) {
      window.clearInterval(state.tickId);
      state.tickId = null;
    }
  }

  function tick() {
    const previous = state.secondsLeft;
    syncRemainingTime();
    if (previous !== state.secondsLeft) {
      renderTimeDigits(previous, state.secondsLeft);
      renderRing();
    }
    if (state.secondsLeft <= 0) {
      completeCurrentSession();
    }
  }

  function syncRemainingTime() {
    if (!state.targetTime) {
      return;
    }
    const remaining = Math.ceil((state.targetTime - Date.now()) / 1000);
    state.secondsLeft = Math.max(0, remaining);
  }

  function completeCurrentSession() {
    stopTicking();
    state.status = STATUS.IDLE;
    state.targetTime = null;
    state.secondsLeft = 0;
    renderTimerState();

    if (state.mode === MODE.FOCUS) {
      completeFocusSession();
      return;
    }
    completeBreakSession();
  }

  function completeFocusSession() {
    const activeTask = state.tasks.find((item) => item.id === state.currentTaskId);
    state.todayStats.pomodoros += 1;
    state.todayStats.totalMinutes += state.settings.focusDuration;
    state.todayStats.cyclePomodoros = Math.min(4, state.todayStats.cyclePomodoros + 1);
    addSessionRecord({
      mode: MODE.FOCUS,
      minutes: state.settings.focusDuration,
      taskTitle: activeTask ? activeTask.title : ""
    });
    incrementCurrentTaskPomodoro();
    updateDailyStreak();
    saveTodayStats();

    const nextMode = state.todayStats.cyclePomodoros >= 4 ? MODE.LONG : MODE.SHORT;
    prepareNextMode(nextMode);
    showCompletionModal(
      "专注完成",
      nextMode === MODE.LONG
        ? "你已经完成 4 个番茄钟，系统已为你切换到长休息。"
        : "完成一个番茄，离目标更近一步。现在进入短休息。"
    );
    playChime();
    sendBrowserNotification("专注完成", "完成一个番茄，离目标更近一步。");
    scheduleAutoStartNext();
  }

  function completeBreakSession() {
    addSessionRecord({
      mode: state.mode,
      minutes: state.mode === MODE.LONG ? state.settings.longBreakDuration : state.settings.shortBreakDuration,
      taskTitle: ""
    });
    if (state.mode === MODE.LONG) {
      state.todayStats.cyclePomodoros = 0;
    }
    saveTodayStats();
    prepareNextMode(MODE.FOCUS);
    showCompletionModal("休息结束", "状态恢复好了，继续下一轮专注吧。");
    playChime();
    sendBrowserNotification("休息结束", "准备开始下一轮专注。");
    scheduleAutoStartNext();
  }

  function skipCurrentSession() {
    if (state.status === STATUS.IDLE) return;
    stopTicking();
    state.status = STATUS.IDLE;
    state.targetTime = null;

    if (state.mode === MODE.FOCUS) {
      // Ending a focus session early — still record it if more than 1 minute elapsed
      const elapsed = state.totalSeconds - Math.max(0, state.secondsLeft);
      if (elapsed > 60) {
        completeFocusSession();
        return;
      }
      // Too short, don't count — just go to break
      state.todayStats.cyclePomodoros = Math.min(4, state.todayStats.cyclePomodoros + 1);
      const nextMode = state.todayStats.cyclePomodoros >= 4 ? MODE.LONG : MODE.SHORT;
      prepareNextMode(nextMode);
      renderAll();
      return;
    }
    // Skipping a break — go back to focus
    prepareNextMode(MODE.FOCUS);
    renderAll();
  }

  function scheduleAutoStartNext() {
    clearAutoStart();
    if (!state.settings.autoStartNext) return;
    state.autoStartTimeoutId = window.setTimeout(() => {
      state.autoStartTimeoutId = null;
      if (state.status === STATUS.IDLE) {
        dom.completeModal.hidden = true;
        startTimer();
      }
    }, 3500);
  }

  function clearAutoStart() {
    if (state.autoStartTimeoutId) {
      window.clearTimeout(state.autoStartTimeoutId);
      state.autoStartTimeoutId = null;
    }
  }

  function addSessionRecord(record) {
    if (!Array.isArray(state.todayStats.sessions)) {
      state.todayStats.sessions = [];
    }
    state.todayStats.sessions.unshift({
      mode: record.mode,
      minutes: record.minutes,
      taskTitle: record.taskTitle || "",
      endedAt: new Date().toISOString()
    });
    if (state.todayStats.sessions.length > 20) {
      state.todayStats.sessions = state.todayStats.sessions.slice(0, 20);
    }
  }

  function normalizeSettings(raw) {
    if (!raw || typeof raw !== "object") return {};
    return {
      focusDuration: clampInteger(raw.focusDuration, 1, 120, DEFAULT_SETTINGS.focusDuration),
      shortBreakDuration: clampInteger(raw.shortBreakDuration, 1, 60, DEFAULT_SETTINGS.shortBreakDuration),
      longBreakDuration: clampInteger(raw.longBreakDuration, 1, 90, DEFAULT_SETTINGS.longBreakDuration),
      dailyGoal: clampInteger(raw.dailyGoal, 1, 16, DEFAULT_SETTINGS.dailyGoal),
      autoStartNext: typeof raw.autoStartNext === "boolean" ? raw.autoStartNext : DEFAULT_SETTINGS.autoStartNext,
      soundEnabled: typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled
    };
  }

  function formatTimeOfDay(isoString) {
    try {
      const d = new Date(isoString);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch (e) {
      return "";
    }
  }

  function prepareNextMode(nextMode) {
    state.mode = nextMode;
    state.status = STATUS.IDLE;
    state.totalSeconds = getDurationSeconds(nextMode);
    state.secondsLeft = state.totalSeconds;
    state.targetTime = null;
    renderAll();
    updateModalActionLabel(nextMode);
  }

  function getDurationSeconds(mode) {
    const minutes = {
      [MODE.FOCUS]: state.settings.focusDuration,
      [MODE.SHORT]: state.settings.shortBreakDuration,
      [MODE.LONG]: state.settings.longBreakDuration
    }[mode] || state.settings.focusDuration;
    return minutes * 60;
  }

  function handleTaskSubmit(event) {
    event.preventDefault();
    const title = dom.taskTitle.value.trim();
    const estimatedPomodoros = Number.parseInt(dom.taskEstimate.value, 10);

    dom.taskError.textContent = "";
    if (!title) {
      dom.taskError.textContent = "请输入今天要完成的任务";
      return;
    }
    if (title.length > 80) {
      dom.taskError.textContent = "任务名称不能超过 80 个字符";
      return;
    }
    if (!Number.isInteger(estimatedPomodoros) || estimatedPomodoros < 1 || estimatedPomodoros > 12) {
      dom.taskError.textContent = "预计番茄数需在 1 到 12 之间";
      return;
    }

    const task = {
      id: createId(),
      title,
      estimatedPomodoros,
      completedPomodoros: 0,
      isCompleted: false,
      isCurrent: state.tasks.every((item) => item.isCompleted),
      createdAt: new Date().toISOString()
    };
    state.tasks.unshift(task);
    if (task.isCurrent) {
      state.currentTaskId = task.id;
    }
    persistTasks();
    dom.taskTitle.value = "";
    dom.taskEstimate.value = "1";
    renderTasks();
    renderCurrentTask();
  }

  function setCurrentTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.isCompleted) {
      return;
    }
    state.tasks.forEach((item) => {
      item.isCurrent = item.id === taskId;
    });
    state.currentTaskId = taskId;
    persistTasks();
    renderTasks();
    renderCurrentTask();
  }

  function toggleTask(taskId) {
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted && task.id === state.currentTaskId) {
      task.isCurrent = false;
      state.currentTaskId = findNextAvailableTaskId();
      if (state.currentTaskId) {
        const nextTask = state.tasks.find((item) => item.id === state.currentTaskId);
        nextTask.isCurrent = true;
      }
    }
    persistTasks();
    renderTasks();
    renderCurrentTask();
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((item) => item.id !== taskId);
    if (state.currentTaskId === taskId) {
      state.currentTaskId = findNextAvailableTaskId();
      state.tasks.forEach((item) => {
        item.isCurrent = item.id === state.currentTaskId;
      });
    }
    persistTasks();
    renderTasks();
    renderCurrentTask();
  }

  function incrementCurrentTaskPomodoro() {
    const task = state.tasks.find((item) => item.id === state.currentTaskId);
    if (!task) {
      return;
    }
    task.completedPomodoros += 1;
    if (task.completedPomodoros >= task.estimatedPomodoros) {
      task.isCompleted = true;
      task.isCurrent = false;
      state.currentTaskId = findNextAvailableTaskId(task.id);
      const nextTask = state.tasks.find((item) => item.id === state.currentTaskId);
      if (nextTask) {
        nextTask.isCurrent = true;
      }
    }
    persistTasks();
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    const nextSettings = {
      focusDuration: Number.parseInt(dom.settingFocus.value, 10),
      shortBreakDuration: Number.parseInt(dom.settingShort.value, 10),
      longBreakDuration: Number.parseInt(dom.settingLong.value, 10),
      dailyGoal: Number.parseInt(dom.settingGoal.value, 10),
      autoStartNext: dom.settingAutoStart.checked,
      soundEnabled: dom.settingSound.checked
    };

    const error = validateSettings(nextSettings);
    if (error) {
      dom.settingsError.textContent = error;
      return;
    }

    dom.settingsError.textContent = "";
    state.settings = nextSettings;
    saveJson(STORAGE.SETTINGS, state.settings);
    if (state.status === STATUS.IDLE) {
      initializeTimerForMode(state.mode);
    }
    closeSettings();
    renderAll();
  }

  function validateSettings(settings) {
    if (!Number.isInteger(settings.focusDuration) || settings.focusDuration < 1 || settings.focusDuration > 120) {
      return "专注时长需在 1 到 120 分钟之间";
    }
    if (!Number.isInteger(settings.shortBreakDuration) || settings.shortBreakDuration < 1 || settings.shortBreakDuration > 60) {
      return "短休息需在 1 到 60 分钟之间";
    }
    if (!Number.isInteger(settings.longBreakDuration) || settings.longBreakDuration < 1 || settings.longBreakDuration > 90) {
      return "长休息需在 1 到 90 分钟之间";
    }
    if (!Number.isInteger(settings.dailyGoal) || settings.dailyGoal < 1 || settings.dailyGoal > 16) {
      return "今日目标需在 1 到 16 个番茄之间";
    }
    return "";
  }

  function renderAll() {
    renderMode();
    renderTimerState();
    renderTasks();
    renderCurrentTask();
    renderSettingsForm();
    renderStats();
    renderHistory();
    renderSessionOverview();
  }

  function renderMode() {
    dom.modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });
    updateModeIndicator();
    dom.ringProgress.classList.remove("mode-focus", "mode-short", "mode-long", "mode-warning");
    dom.ringProgress.classList.add(`mode-${state.mode}`);
    document.body.dataset.focusMode = state.mode;
  }

  function renderTimerState() {
    renderModeLabel();
    renderTimeDigits(state.secondsLeft, state.secondsLeft);
    renderRoundLabel();
    renderRing();
    renderTimerButtons();
    renderGlow();
    renderPageTitle();
    renderSessionOverview();
  }

  function renderModeLabel() {
    dom.modeLabel.textContent = {
      [MODE.FOCUS]: "专注模式",
      [MODE.SHORT]: "短休息",
      [MODE.LONG]: "长休息"
    }[state.mode];
  }

  function renderTimeDigits(previousSeconds, nextSeconds) {
    const previous = splitTime(previousSeconds);
    const next = splitTime(nextSeconds);
    [
      [dom.minTens, previous[0], next[0]],
      [dom.minOnes, previous[1], next[1]],
      [dom.secTens, previous[3], next[3]],
      [dom.secOnes, previous[4], next[4]]
    ].forEach(([element, oldValue, newValue]) => {
      if (element.textContent !== newValue) {
        element.textContent = newValue;
      }
      if (oldValue !== newValue) {
        element.classList.add("bump");
        window.setTimeout(() => element.classList.remove("bump"), 160);
      }
    });
  }

  function renderRoundLabel() {
    if (state.mode !== MODE.FOCUS) {
      dom.roundLabel.textContent = state.mode === MODE.LONG ? "长休息中" : "短休息中";
      dom.roundLabel.classList.add("break-badge");
      return;
    }
    const round = Math.min(4, state.todayStats.cyclePomodoros + 1);
    dom.roundLabel.textContent = `第 ${round} / 4 个番茄`;
    dom.roundLabel.classList.remove("break-badge");
  }

  function renderRing() {
    const progress = state.totalSeconds > 0 ? (state.totalSeconds - state.secondsLeft) / state.totalSeconds : 0;
    dom.ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    dom.ringProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progress)}`;
    dom.ringProgress.classList.toggle("mode-warning", state.status === STATUS.RUNNING && state.secondsLeft <= 60);
    if (dom.sessionProgressLabel) {
      dom.sessionProgressLabel.textContent = `${Math.round(progress * 100)}% 完成`;
    }
  }

  function renderTimerButtons() {
    const label = dom.startPauseButton.querySelector("span");
    dom.startPauseButton.classList.toggle("primary", state.status !== STATUS.RUNNING);
    dom.startPauseButton.classList.toggle("ghost", state.status === STATUS.RUNNING);

    if (state.status === STATUS.RUNNING) {
      label.textContent = "暂停一下";
      replaceButtonIcon(dom.startPauseButton, "pause");
    } else if (state.status === STATUS.PAUSED) {
      label.textContent = "继续专注";
      replaceButtonIcon(dom.startPauseButton, "play");
    } else {
      label.textContent = state.mode === MODE.FOCUS ? "开始专注" : "开始休息";
      replaceButtonIcon(dom.startPauseButton, "play");
    }

    // Skip button: visible during running/paused, label depends on mode
    const showSkip = state.status === STATUS.RUNNING || state.status === STATUS.PAUSED;
    dom.skipButton.hidden = !showSkip;
    if (showSkip) {
      const skipLabel = dom.skipButton.querySelector("span");
      skipLabel.textContent = state.mode === MODE.FOCUS ? "提前结束" : "跳过休息";
      replaceButtonIcon(dom.skipButton, "skip-forward");
    }

    dom.resetButton.disabled = state.status === STATUS.IDLE && state.secondsLeft === state.totalSeconds;
  }

  function renderGlow() {
    dom.timerGlow.classList.remove("breathing", "running", "warning");
    if (state.status === STATUS.RUNNING && state.secondsLeft <= 60) {
      dom.timerGlow.classList.add("warning");
    } else if (state.status === STATUS.RUNNING) {
      dom.timerGlow.classList.add("running");
    } else {
      dom.timerGlow.classList.add("breathing");
    }
  }

  function renderPageTitle() {
    const time = formatClock(state.secondsLeft);
    const modeLabel = {
      [MODE.FOCUS]: "Focus",
      [MODE.SHORT]: "Short Break",
      [MODE.LONG]: "Long Break"
    }[state.mode] || "Focus";
    const statusLabel = state.status === STATUS.PAUSED ? "Paused" : modeLabel;
    document.title = `${time} - ${statusLabel} - StudyFlow`;
  }

  function renderCurrentTask() {
    const task = state.tasks.find((item) => item.id === state.currentTaskId);
    dom.currentTaskLabel.textContent = task ? task.title : "选择一个任务开始专注";
    dom.currentTaskCard.classList.toggle("no-task", !task);
  }

  function renderTasks() {
    dom.taskCount.textContent = `${state.tasks.length} 项任务`;
    if (state.tasks.length === 0) {
      dom.taskList.innerHTML = `
        <div class="task-empty-state">
          <i data-lucide="clipboard-list"></i>
          <div>还没有任务，添加一个开始吧</div>
        </div>
      `;
      renderIcons();
      return;
    }

    dom.taskList.innerHTML = state.tasks.map(renderTaskItem).join("");
    dom.taskList.querySelectorAll("[data-select-task]").forEach((element) => {
      element.addEventListener("click", () => setCurrentTask(element.dataset.selectTask));
    });
    dom.taskList.querySelectorAll("[data-toggle-task]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleTask(element.dataset.toggleTask);
      });
    });
    dom.taskList.querySelectorAll("[data-delete-task]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteTask(element.dataset.deleteTask);
      });
    });
    renderIcons();
  }

  function renderTaskItem(task) {
    const current = task.id === state.currentTaskId && !task.isCompleted;
    const progressText = `${task.completedPomodoros} / ${task.estimatedPomodoros}`;
    return `
      <article class="task-item${current ? " current" : ""}${task.isCompleted ? " completed" : ""}" data-task-id="${task.id}">
        <input class="task-checkbox" data-toggle-task="${task.id}" type="checkbox" ${task.isCompleted ? "checked" : ""} aria-label="完成任务">
        <button class="task-body-el" data-select-task="${task.id}" type="button" ${task.isCompleted ? "disabled" : ""}>
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="task-meta">
            <i data-lucide="timer"></i>
            预计 ${task.estimatedPomodoros} 个 · 已完成 ${progressText}
          </span>
        </button>
        ${current ? '<span class="current-tag"><i data-lucide="radio"></i>专注中</span>' : ""}
        <button class="task-delete-btn" data-delete-task="${task.id}" type="button" aria-label="删除任务">
          <i data-lucide="trash-2"></i>
        </button>
      </article>
    `;
  }

  function renderSettingsForm() {
    dom.settingFocus.value = state.settings.focusDuration;
    dom.settingShort.value = state.settings.shortBreakDuration;
    dom.settingLong.value = state.settings.longBreakDuration;
    dom.settingGoal.value = state.settings.dailyGoal;
    dom.settingAutoStart.checked = state.settings.autoStartNext;
    dom.settingSound.checked = state.settings.soundEnabled;
  }

  function renderStats() {
    const pomodoros = state.todayStats.pomodoros;
    const totalMinutes = state.todayStats.totalMinutes;
    const cycle = state.todayStats.cyclePomodoros;
    const dailyGoal = Math.max(1, state.settings.dailyGoal);
    $$("[data-stat-pomodoros]").forEach((element) => {
      element.textContent = pomodoros;
    });
    $$("[data-stat-minutes]").forEach((element) => {
      element.textContent = formatMinutes(totalMinutes);
    });
    $$("[data-stat-streak]").forEach((element) => {
      element.textContent = state.currentStreak;
    });
    $$("[data-daily-goal-label]").forEach((element) => {
      element.textContent = `${Math.min(pomodoros, dailyGoal)} / ${dailyGoal}`;
    });
    $$("[data-daily-progress]").forEach((element) => {
      element.style.width = `${Math.min(100, (pomodoros / dailyGoal) * 100)}%`;
    });
    $$("[data-insight-copy]").forEach((element) => {
      element.textContent = getEncouragement();
    });
    renderSessionOverview();
    renderHistory();
  }

  function renderHistory() {
    if (!dom.sessionHistory || !dom.historySummary) {
      return;
    }
    const sessions = Array.isArray(state.todayStats.sessions) ? state.todayStats.sessions : [];
    const focusSessions = sessions.filter((session) => session.mode === MODE.FOCUS);
    dom.historySummary.textContent = focusSessions.length
      ? `已记录 ${focusSessions.length} 段专注`
      : "暂无专注记录";

    if (sessions.length === 0) {
      dom.sessionHistory.innerHTML = `
        <div class="history-empty">
          <i data-lucide="history"></i>
          <span>完成一个番茄后，这里会留下今天的节奏。</span>
        </div>
      `;
      renderIcons();
      return;
    }

    dom.sessionHistory.innerHTML = sessions.slice(0, 8).map(renderSessionItem).join("");
    renderIcons();
  }

  function renderSessionItem(session) {
    const modeLabel = {
      [MODE.FOCUS]: "专注",
      [MODE.SHORT]: "短休息",
      [MODE.LONG]: "长休息"
    }[session.mode] || "记录";
    const taskText = session.taskTitle ? ` · ${escapeHtml(session.taskTitle)}` : "";
    return `
      <article class="history-item mode-${escapeHtml(session.mode)}">
        <span class="history-dot"></span>
        <div class="history-body">
          <strong>${modeLabel}<span>${taskText}</span></strong>
          <small>${formatTimeOfDay(session.endedAt)} · ${session.minutes} 分钟</small>
        </div>
      </article>
    `;
  }

  function renderSessionOverview() {
    renderSessionStatus();
    renderNextModeLabel();
    renderCycleTrack();
  }

  function renderSessionStatus() {
    document.body.dataset.focusStatus = state.status;
    if (!dom.sessionStatus) {
      return;
    }
    if (state.status === STATUS.RUNNING) {
      dom.sessionStatus.textContent = state.mode === MODE.FOCUS ? "专注进行中" : "休息进行中";
      return;
    }
    if (state.status === STATUS.PAUSED) {
      dom.sessionStatus.textContent = "已暂停";
      return;
    }
    dom.sessionStatus.textContent = {
      [MODE.FOCUS]: "准备专注",
      [MODE.SHORT]: "准备短休息",
      [MODE.LONG]: "准备长休息"
    }[state.mode];
  }

  function renderNextModeLabel() {
    if (!dom.nextModeLabel) {
      return;
    }
    if (state.mode === MODE.FOCUS) {
      dom.nextModeLabel.textContent = state.todayStats.cyclePomodoros >= 3
        ? "完成本轮后进入长休息"
        : "完成专注后进入短休息";
      return;
    }
    if (state.mode === MODE.LONG) {
      dom.nextModeLabel.textContent = "长休息结束后重置轮次";
      return;
    }
    dom.nextModeLabel.textContent = "休息结束后回到专注模式";
  }

  function renderCycleTrack() {
    if (!dom.cycleDots.length) {
      return;
    }
    dom.cycleDots.forEach((dot) => {
      const step = Number.parseInt(dot.dataset.cycleDot, 10);
      const activeStep = Math.min(4, state.todayStats.cyclePomodoros + 1);
      dot.classList.toggle("done", state.todayStats.cyclePomodoros >= step);
      dot.classList.toggle("active", state.mode === MODE.FOCUS && activeStep === step);
    });
  }

  function getEncouragement() {
    const count = state.todayStats.pomodoros;
    const streak = state.currentStreak;
    const streakStr = streak > 1 ? `，已连续专注 ${streak} 天` : "";

    if (count === 0) {
      return streak > 1
        ? `今天还没有开始${streakStr}。挑一个任务保持节奏！`
        : "今天还没有开始，挑一个任务进入状态。";
    }
    if (count < state.settings.dailyGoal) {
      return `保持节奏，你已经完成了 ${count} 个番茄钟${streakStr}。`;
    }
    return `今日目标已达成！你完成了 ${count} 个番茄钟${streakStr}。`;
  }

  function openSettings() {
    dom.settingsOverlay.hidden = false;
    dom.settingFocus.focus();
  }

  function closeSettings() {
    dom.settingsOverlay.hidden = true;
    dom.settingsError.textContent = "";
  }

  function openStats() {
    dom.statsModal.hidden = false;
    renderStats();
  }

  function closeStats() {
    dom.statsModal.hidden = true;
  }

  function showCompletionModal(title, message) {
    dom.modalTitle.textContent = title;
    dom.modalMessage.textContent = message;
    dom.completeModal.hidden = false;
    updateModalActionLabel(state.mode);
    renderIcons();
  }

  function hideCompletionModal() {
    dom.completeModal.hidden = true;
    clearAutoStart();
  }

  function updateModalActionLabel(mode) {
    const label = dom.modalNext.querySelector("span");
    if (!label) {
      return;
    }
    label.textContent = {
      [MODE.FOCUS]: "开始专注",
      [MODE.SHORT]: "开始短休息",
      [MODE.LONG]: "开始长休息"
    }[mode] || "开始下一段";
  }

  function updateModeIndicator() {
    const active = dom.modeButtons.find((button) => button.dataset.mode === state.mode);
    if (!active || !dom.modeIndicator) {
      return;
    }
    dom.modeIndicator.style.left = `${active.offsetLeft}px`;
    dom.modeIndicator.style.width = `${active.offsetWidth}px`;
  }

  function replaceButtonIcon(button, iconName) {
    const existing = button.querySelector("svg, i");
    if (existing) {
      existing.remove();
    }
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", iconName);
    button.insertBefore(icon, button.firstChild);
    renderIcons();
  }

  function requestBrowserNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }

  function sendBrowserNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body });
      } catch (error) {
        // 浏览器通知不是核心流程。
      }
    }
  }

  function playChime() {
    if (!state.settings.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      const context = new AudioContextClass();
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        gain.connect(context.destination);
        const start = context.currentTime + index * 0.13;
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
        oscillator.start(start);
        oscillator.stop(start + 0.45);
      });
    } catch (error) {
      // 提示音失败不影响计时器。
    }
  }

  function persistTasks() {
    saveJson(STORAGE.TASKS, state.tasks);
  }

  function updateDailyStreak() {
    const today = todayKey();
    if (state.lastActiveDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    if (state.lastActiveDate === yKey) {
      state.currentStreak += 1;
    } else if (!state.lastActiveDate) {
      state.currentStreak = 1;
    } else {
      state.currentStreak = 1;
    }
    state.lastActiveDate = today;
    saveJson(STORAGE.STREAK, { currentStreak: state.currentStreak, lastActiveDate: today });
  }

  function saveTodayStats() {
    const allStats = loadJson(STORAGE.STATS, {});
    allStats[todayKey()] = state.todayStats;
    saveJson(STORAGE.STATS, allStats);
  }

  function findNextAvailableTaskId(excludeId = "") {
    const next = state.tasks.find((task) => !task.isCompleted && task.id !== excludeId);
    return next ? next.id : null;
  }

  function normalizeTasks(tasks) {
    if (!Array.isArray(tasks)) {
      return [];
    }
    let currentSeen = false;
    return tasks.map((task) => {
      const normalized = {
        id: String(task.id || createId()),
        title: String(task.title || "").slice(0, 80),
        estimatedPomodoros: clampInteger(task.estimatedPomodoros, 1, 12, 1),
        completedPomodoros: clampInteger(task.completedPomodoros, 0, 999, 0),
        isCompleted: Boolean(task.isCompleted),
        isCurrent: Boolean(task.isCurrent),
        createdAt: task.createdAt || new Date().toISOString()
      };
      if (normalized.isCompleted || currentSeen) {
        normalized.isCurrent = false;
      }
      if (normalized.isCurrent) {
        currentSeen = true;
      }
      return normalized;
    }).filter((task) => task.title);
  }

  function normalizeStats(stats, date) {
    return {
      ...createEmptyStats(date),
      ...(stats || {}),
      pomodoros: clampInteger(stats?.pomodoros, 0, 999, 0),
      totalMinutes: clampInteger(stats?.totalMinutes, 0, 99999, 0),
      cyclePomodoros: clampInteger(stats?.cyclePomodoros, 0, 4, 0),
      sessions: normalizeSessions(stats?.sessions)
    };
  }

  function createEmptyStats(date) {
    return {
      date,
      pomodoros: 0,
      totalMinutes: 0,
      cyclePomodoros: 0,
      sessions: []
    };
  }

  function normalizeSessions(sessions) {
    if (!Array.isArray(sessions)) {
      return [];
    }
    return sessions.slice(0, 20).map((session) => ({
      mode: Object.values(MODE).includes(session.mode) ? session.mode : MODE.FOCUS,
      minutes: clampInteger(session.minutes, 1, 999, DEFAULT_SETTINGS.focusDuration),
      taskTitle: String(session.taskTitle || "").slice(0, 80),
      endedAt: session.endedAt || new Date().toISOString()
    }));
  }

  function todayKey() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function splitTime(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
    const secs = String(safeSeconds % 60).padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function formatClock(seconds) {
    return splitTime(seconds);
  }

  function formatMinutes(minutes) {
    if (minutes <= 0) {
      return "0m";
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isInteger(number)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, number));
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // localStorage 可能被浏览器策略限制。
    }
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
})();
