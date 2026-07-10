export function initTimer({ toast } = {}) {
  const inputMinutes = document.getElementById("input-minutes");
  const displayMinutes = document.getElementById("display-minutes");
  const displaySeconds = document.getElementById("display-seconds");
  const btnStart = document.getElementById("btn-start");
  const btnReset = document.getElementById("btn-reset");

  if (!inputMinutes || !displayMinutes || !displaySeconds || !btnStart || !btnReset) {
    return;
  }

  let timerInterval = null;
  let totalSeconds = 25 * 60;
  let timeRemaining = totalSeconds;
  let isRunning = false;
  let hasStarted = false;
  let timerStartedAt = 0;

  const sanitizeMinutes = () => {
    let val = Number.parseInt(inputMinutes.value, 10);
    if (Number.isNaN(val) || val < 1) {
      val = 1;
    }
    if (val > 120) {
      val = 120;
    }
    inputMinutes.value = String(val);
    return val;
  };

  const updateDisplay = () => {
    const wholeSeconds = Math.max(0, Math.ceil(timeRemaining));
    const minutes = Math.floor(wholeSeconds / 60);
    const seconds = wholeSeconds % 60;
    displayMinutes.textContent = String(minutes).padStart(2, "0");
    displaySeconds.textContent = String(seconds).padStart(2, "0");
  };

  const postClock = (type) => {
    window.postMessage({
      type,
      minutes: totalSeconds / 60,
      total: totalSeconds,
      remaining: timeRemaining
    }, "*");
  };

  const setButton = (label, icon) => {
    btnStart.innerHTML = `<span class="material-symbols-outlined" data-icon="${icon}">${icon}</span><span class="hidden sm:inline">${label}</span>`;
    btnStart.setAttribute("aria-label", `${label}计时`);
    btnStart.title = `${label}计时`;
  };

  const setDurationFromInput = () => {
    totalSeconds = sanitizeMinutes() * 60;
    timeRemaining = totalSeconds;
    hasStarted = false;
    updateDisplay();
    postClock("SET_TIMER_DURATION");
  };

  const refreshRemaining = () => {
    if (!isRunning) {
      return;
    }
    const elapsed = (performance.now() - timerStartedAt) / 1000;
    timeRemaining = Math.max(0, totalSeconds - elapsed);
  };

  const emitTick = () => {
    window.dispatchEvent(new CustomEvent("studyflow:timerTick", {
      detail: { remaining: timeRemaining, total: totalSeconds }
    }));
  };

  const finishTimer = () => {
    window.clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    hasStarted = false;
    timeRemaining = 0;
    updateDisplay();
    emitTick();
    setButton("开始", "play_arrow");
    inputMinutes.disabled = false;
    btnReset.classList.add("hidden");
    toast?.("专注时间到！");
    timeRemaining = totalSeconds;
    updateDisplay();
    postClock("RESET_TIMER");
  };

  const tick = () => {
    refreshRemaining();
    updateDisplay();
    emitTick();
    if (timeRemaining <= 0) {
      finishTimer();
    }
  };

  const startTicker = () => {
    window.clearInterval(timerInterval);
    timerInterval = window.setInterval(tick, 250);
    tick();
  };

  inputMinutes.addEventListener("input", () => {
    if (!isRunning) {
      setDurationFromInput();
    }
  });

  btnStart.addEventListener("click", () => {
    if (isRunning) {
      refreshRemaining();
      window.clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      setButton("继续", "play_arrow");
      inputMinutes.disabled = false;
      postClock("PAUSE_TIMER");
      return;
    }

    totalSeconds = sanitizeMinutes() * 60;
    if (!hasStarted || timeRemaining <= 0 || timeRemaining > totalSeconds) {
      timeRemaining = totalSeconds;
    }
    isRunning = true;
    hasStarted = true;
    timerStartedAt = performance.now() - (totalSeconds - timeRemaining) * 1000;
    inputMinutes.disabled = true;
    setButton("暂停", "pause");
    btnReset.classList.remove("hidden");
    postClock("START_TIMER");
    startTicker();
  });

  btnReset.addEventListener("click", () => {
    window.clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    hasStarted = false;
    totalSeconds = sanitizeMinutes() * 60;
    timeRemaining = totalSeconds;
    updateDisplay();
    setButton("开始", "play_arrow");
    inputMinutes.disabled = false;
    btnReset.classList.add("hidden");
    postClock("RESET_TIMER");
    window.dispatchEvent(new CustomEvent("studyflow:timerReset"));
  });

  setDurationFromInput();
}
