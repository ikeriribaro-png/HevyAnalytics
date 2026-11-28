function escHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/**
 * Hevy Analytics Dashboard Client
 * Supports Volume, RMs, Routines, Muscle Groups, Fractional Sets & Period Comparison (% Mejora/Empeoramiento)
 */

let allSessions = [];
let allExercises = [];
let muscleGroups = [];
let routineCategories = [];
let exerciseMuscleMap = {};
let exerciseSecondaryMap = {};
let defaultExerciseBalanceMap = {};
let exerciseBalanceMap = {};
let userBodyweightKg = 75;
let userBalanceOverrides = {};
const BALANCE_CONFIG_STORAGE_KEY = 'hevy_balance_config';

let filteredSessions = [];
let previousPeriodSessions = [];
let activeMetric = 'volume'; // 'volume' | 'sets' | 'pr_count' | 'sum_orm' | 'best_orm' | 'best_weight'
let currentFilterType = 'all'; // 'all' | 'muscle' | 'routine' | 'exercise'
let currentFilterValue = 'ALL';
let chartType = 'line';

let chartInstance = null;
let donutChartInstance = null;
let barChartInstance = null;
let radarRepsChartInstance = null;
let radarVolumeChartInstance = null;
let currentSessionIndex = -1;
let currentBreakdownView = 'muscle'; // 'muscle' | 'routine'
let useFractionalSets = true; // Toggle for fractional series counting
let statsMode = 'raw'; // 'raw' (kg brutos) | 'balanced' (kg equivalentes)
let calendarMode = 'all'; // 'all' | 'split'

const SPANISH_MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MUSCLE_COLORS = {
  "Pierna": { bg: "#10b981", border: "#34d399", text: "text-emerald-400", light: "rgba(16, 185, 129, 0.15)" },
  "Espalda": { bg: "#3b82f6", border: "#60a5fa", text: "text-blue-400", light: "rgba(59, 130, 246, 0.15)" },
  "Pecho": { bg: "#ef4444", border: "#f87171", text: "text-red-400", light: "rgba(239, 68, 68, 0.15)" },
  "Bíceps": { bg: "#8b5cf6", border: "#a78bfa", text: "text-purple-400", light: "rgba(139, 92, 246, 0.15)" },
  "Hombro": { bg: "#f59e0b", border: "#fbbf24", text: "text-amber-400", light: "rgba(245, 158, 11, 0.15)" },
  "Tríceps": { bg: "#06b6d4", border: "#22d3ee", text: "text-cyan-400", light: "rgba(6, 182, 212, 0.15)" },
  "Abdomen": { bg: "#eab308", border: "#facc15", text: "text-yellow-400", light: "rgba(234, 179, 8, 0.15)" },
  "Cardio / Otro": { bg: "#64748b", border: "#94a3b8", text: "text-slate-400", light: "rgba(100, 116, 139, 0.15)" }
};

const ROUTINE_COLORS = {
  "Push (Empuje)": { bg: "#ef4444", border: "#f87171", text: "text-red-400", light: "rgba(239, 68, 68, 0.15)" },
  "Pull (Tirón)": { bg: "#3b82f6", border: "#60a5fa", text: "text-blue-400", light: "rgba(59, 130, 246, 0.15)" },
  "Legs (Pierna)": { bg: "#10b981", border: "#34d399", text: "text-emerald-400", light: "rgba(16, 185, 129, 0.15)" },
  "Espalda y Pecho": { bg: "#ec4899", border: "#f472b6", text: "text-pink-400", light: "rgba(236, 72, 153, 0.15)" },
  "Hombro y Brazos": { bg: "#6366f1", border: "#818cf8", text: "text-indigo-400", light: "rgba(99, 102, 241, 0.15)" },
  "Torso": { bg: "#f59e0b", border: "#fbbf24", text: "text-amber-400", light: "rgba(245, 158, 11, 0.15)" },
  "Full Body": { bg: "#06b6d4", border: "#22d3ee", text: "text-cyan-400", light: "rgba(6, 182, 212, 0.15)" },
  "Brazos": { bg: "#8b5cf6", border: "#a78bfa", text: "text-purple-400", light: "rgba(139, 92, 246, 0.15)" },
  "Core / Abdomen": { bg: "#eab308", border: "#facc15", text: "text-yellow-400", light: "rgba(234, 179, 8, 0.15)" },
  "General / Otro": { bg: "#64748b", border: "#94a3b8", text: "text-slate-400", light: "rgba(100, 116, 139, 0.15)" }
};

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  applyData(null, '');
});

function setupEventListeners() {
  // Sidebar nav active state
  document.querySelectorAll('.hevy-nav-item[href]').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.hevy-nav-item[href]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Metric buttons
  document.querySelectorAll('#metricTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#metricTabs button').forEach(b => {
        b.className = "metric-tab py-1.5 px-3 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap";
      });
      btn.className = "metric-tab active py-1.5 px-3 rounded-md text-xs font-medium bg-brand-600 text-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap";

      activeMetric = btn.dataset.metric;
      updateUI();
    });
  });

  // Filter Type buttons (Todo | Músculo | Rutina | Ejercicio)
  document.querySelectorAll('#filterTypeButtons button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterTypeButtons button').forEach(b => {
        b.className = "filter-type-btn px-2.5 py-0.5 rounded-md bg-dark-850 text-zinc-400 hover:text-white font-medium";
      });
      btn.className = "filter-type-btn active px-2.5 py-0.5 rounded-md bg-brand-600 text-white font-medium";

      currentFilterType = btn.dataset.type;
      rebuildFilterDropdown();
      currentFilterValue = document.getElementById('mainFilterSelect').value;
      updateUI();
    });
  });

  // Main Filter Select change
  document.getElementById('mainFilterSelect').addEventListener('change', (e) => {
    currentFilterValue = e.target.value;
    updateUI();
  });

  // Range preset buttons (including 1w, 1m, 3m, 6m, 1y, all)
  document.querySelectorAll('.range-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPresetRange(btn.dataset.range);
    });
  });

  // Week stepper navigation
  document.getElementById('btnPrevWeek').addEventListener('click', () => stepWeek(-1));
  document.getElementById('btnCurrentWeek').addEventListener('click', () => applyPresetRange('1w'));
  document.getElementById('btnNextWeek').addEventListener('click', () => stepWeek(1));

  // Custom date inputs
  document.getElementById('dateStart').addEventListener('change', () => {
    clearPresetSelection();
    updateUI();
  });
  document.getElementById('dateEnd').addEventListener('change', () => {
    clearPresetSelection();
    updateUI();
  });

  // Chart type toggles
  document.getElementById('btnChartLine').addEventListener('click', () => {
    chartType = 'line';
    document.getElementById('btnChartLine').className = "px-2.5 py-1 rounded-md bg-dark-800 text-white font-medium";
    document.getElementById('btnChartBar').className = "px-2.5 py-1 rounded-md text-slate-400 hover:text-white";
    renderChart();
  });

  document.getElementById('btnChartBar').addEventListener('click', () => {
    chartType = 'bar';
    document.getElementById('btnChartBar').className = "px-2.5 py-1 rounded-md bg-dark-800 text-white font-medium";
    document.getElementById('btnChartLine').className = "px-2.5 py-1 rounded-md text-slate-400 hover:text-white";
    renderChart();
  });

  // Fractional Sets Toggles (Top bar & Breakdown section synchronized)
  function setFractionalMode(isFrac) {
    useFractionalSets = isFrac;
    const btnDirect = document.getElementById('btnSetModeDirect');
    const btnFrac = document.getElementById('btnSetModeFractional');
    const btnTopDirect = document.getElementById('btnTopModeDirect');
    const btnTopFrac = document.getElementById('btnTopModeFractional');
    const banner = document.getElementById('fractionalNoteBanner');

    const activeCls = "active px-2.5 py-1 rounded-md bg-brand-600 text-white font-medium transition-colors";
    const inactiveCls = "px-2.5 py-1 rounded-md text-zinc-400 hover:text-white font-medium transition-colors";
    const activeTopCls = "active px-2.5 py-1 rounded-md bg-brand-600 text-white font-medium transition-colors";
    const inactiveTopCls = "px-2.5 py-1 rounded-md text-zinc-400 hover:text-white font-medium transition-colors";

    if (isFrac) {
      btnFrac.className = activeCls;
      btnDirect.className = inactiveCls;
      btnTopFrac.className = activeTopCls;
      btnTopDirect.className = inactiveTopCls;
      banner.classList.remove('hidden');
    } else {
      btnDirect.className = activeCls;
      btnFrac.className = inactiveCls;
      btnTopDirect.className = activeTopCls;
      btnTopFrac.className = inactiveTopCls;
      banner.classList.add('hidden');
    }
    updateUI();
  }

  document.getElementById('btnSetModeDirect').addEventListener('click', () => setFractionalMode(false));
  document.getElementById('btnSetModeFractional').addEventListener('click', () => setFractionalMode(true));
  document.getElementById('btnTopModeDirect').addEventListener('click', () => setFractionalMode(false));
  document.getElementById('btnTopModeFractional').addEventListener('click', () => setFractionalMode(true));

  // Stats Mode Toggle (Tal cual Bruto vs Equilibrada Normalizada)
  const btnRaw = document.getElementById('btnStatsRaw');
  const btnBalanced = document.getElementById('btnStatsBalanced');
  const modeHint = document.getElementById('statsModeHint');

  btnRaw.addEventListener('click', () => {
    statsMode = 'raw';
    btnRaw.className = "active px-2.5 py-1 rounded-md bg-brand-600 text-white font-medium transition-colors";
    btnBalanced.className = "px-2.5 py-1 rounded-md text-zinc-400 hover:text-white font-medium transition-colors";
    modeHint.innerHTML = 'Mostrando kilogramos reales brutos (<code class="text-zinc-300">peso × reps</code>).';
    updateUI();
  });

  btnBalanced.addEventListener('click', () => {
    statsMode = 'balanced';
    btnBalanced.className = "active px-2.5 py-1 rounded-md bg-cyan-600 text-white font-medium transition-colors";
    btnRaw.className = "px-2.5 py-1 rounded-md text-zinc-400 hover:text-white font-medium transition-colors";
    modeHint.innerHTML = 'Convirtiendo cargas a <strong>kg equivalentes reales</strong> (<code class="text-cyan-300">(peso + %PC × PC) × lados × factor mec.</code>).';
    updateUI();
  });

  // Balance Calibration Modal
  const balanceModal = document.getElementById('balanceConfigModal');
  const btnOpenBalance = document.getElementById('btnOpenBalanceModal');
  const btnCloseBalance = document.getElementById('btnCloseBalanceModal');
  const btnDoneBalance = document.getElementById('btnDoneBalanceModal');
  const btnResetBalance = document.getElementById('btnResetBalanceConfig');
  const inputBw = document.getElementById('inputBodyweightKg');
  const balanceSearch = document.getElementById('balanceSearchInput');
  const balanceUsedOnly = document.getElementById('balanceFilterUsedOnly');

  if (btnOpenBalance && balanceModal) {
    btnOpenBalance.addEventListener('click', () => {
      if (inputBw) inputBw.value = userBodyweightKg;
      renderBalanceModal();
      balanceModal.classList.remove('hidden');
    });
  }
  const closeBalanceModal = () => {
    if (balanceModal) balanceModal.classList.add('hidden');
  };
  if (btnCloseBalance) btnCloseBalance.addEventListener('click', closeBalanceModal);
  if (btnDoneBalance) btnDoneBalance.addEventListener('click', closeBalanceModal);
  if (balanceModal) {
    balanceModal.addEventListener('click', (e) => {
      if (e.target === balanceModal) closeBalanceModal();
    });
  }
  if (balanceSearch) balanceSearch.addEventListener('input', () => renderBalanceModal());
  if (balanceUsedOnly) balanceUsedOnly.addEventListener('change', () => renderBalanceModal());
  if (inputBw) {
    inputBw.addEventListener('change', () => {
      const val = parseFloat(inputBw.value);
      userBodyweightKg = (!Number.isNaN(val) && val >= 30 && val <= 250) ? val : 75;
      inputBw.value = userBodyweightKg;
      saveBalanceConfig();
      recalculateBalancedMetrics();
      renderBalanceModal();
      updateUI();
      if (currentSessionIndex >= 0 && filteredSessions[currentSessionIndex]) {
        showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
      }
    });
  }
  if (btnResetBalance) {
    btnResetBalance.addEventListener('click', () => {
      userBodyweightKg = 75;
      userBalanceOverrides = {};
      try { localStorage.removeItem(BALANCE_CONFIG_STORAGE_KEY); } catch (_) {}
      if (inputBw) inputBw.value = userBodyweightKg;
      mergeBalanceMap();
      recalculateBalancedMetrics();
      renderBalanceModal();
      updateUI();
      if (currentSessionIndex >= 0 && filteredSessions[currentSessionIndex]) {
        showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
      }
      showToast('Factores biomecánicos restaurados a los valores por defecto');
    });
  }

  // Breakdown Section Tabs (Muscle vs Routine)
  const tabMuscle = document.getElementById('tabBreakdownMuscle');
  const tabRoutine = document.getElementById('tabBreakdownRoutine');

  tabMuscle.addEventListener('click', () => {
    currentBreakdownView = 'muscle';
    tabMuscle.className = "active py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-brand-600 text-white shadow-sm";
    tabRoutine.className = "py-1.5 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-2";
    renderBreakdownSection();
  });

  tabRoutine.addEventListener('click', () => {
    currentBreakdownView = 'routine';
    tabRoutine.className = "active py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-brand-600 text-white shadow-sm";
    tabMuscle.className = "py-1.5 px-4 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-2";
    renderBreakdownSection();
  });

  // Upload local CSV
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);

  // Navigation
  document.getElementById('btnPrevSession').addEventListener('click', () => {
    if (currentSessionIndex > 0) {
      currentSessionIndex--;
      showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
      highlightSelectedPoint();
    }
  });

  document.getElementById('btnNextSession').addEventListener('click', () => {
    if (currentSessionIndex < filteredSessions.length - 1) {
      currentSessionIndex++;
      showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
      highlightSelectedPoint();
    }
  });

  // Radar period selector
  const radarSelect = document.getElementById('radarPeriodSelect');
  if (radarSelect) {
    radarSelect.addEventListener('change', () => renderMuscleRadarCharts());
  }

  // Activity calendar mode & range controls
  const btnCalAll = document.getElementById('btnCalAll');
  const btnCalSplit = document.getElementById('btnCalSplit');
  if (btnCalAll && btnCalSplit) {
    btnCalAll.addEventListener('click', () => {
      calendarMode = 'all';
      btnCalAll.className = "px-3 py-1 rounded-md bg-slate-100 text-dark-950 font-bold transition-colors";
      btnCalSplit.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white font-medium transition-colors";
      renderActivityCalendar();
    });
    btnCalSplit.addEventListener('click', () => {
      calendarMode = 'split';
      btnCalSplit.className = "px-3 py-1 rounded-md bg-slate-100 text-dark-950 font-bold transition-colors";
      btnCalAll.className = "px-3 py-1 rounded-md text-slate-400 hover:text-white font-medium transition-colors";
      renderActivityCalendar();
    });
  }

  const calRangeSel = document.getElementById('calendarRangeSelect');
  const calCustomBox = document.getElementById('calendarCustomDates');
  const calStartEl = document.getElementById('calDateStart');
  const calEndEl = document.getElementById('calDateEnd');
  if (calRangeSel) {
    calRangeSel.addEventListener('change', () => {
      const isCustom = calRangeSel.value === 'custom';
      if (calCustomBox) calCustomBox.classList.toggle('hidden', !isCustom);
      if (isCustom && calStartEl && calEndEl && (!calStartEl.value || !calEndEl.value) && allSessions.length) {
        const topStart = document.getElementById('dateStart')?.value;
        const topEnd = document.getElementById('dateEnd')?.value;
        calEndEl.value = topEnd || allSessions[allSessions.length - 1].date_day;
        calStartEl.value = topStart || allSessions[0].date_day;
      }
      renderActivityCalendar();
    });
  }
  if (calStartEl) calStartEl.addEventListener('change', () => renderActivityCalendar());
  if (calEndEl) calEndEl.addEventListener('change', () => renderActivityCalendar());
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.className = `fixed bottom-6 right-6 z-50 transform transition-all duration-300 max-w-md p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-sm ${
    isError 
      ? 'bg-red-950/90 border-red-500/50 text-red-200 translate-y-0 opacity-100' 
      : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 translate-y-0 opacity-100'
  }`;
  toast.innerHTML = `
    <i class="fa-solid ${isError ? 'fa-circle-exclamation text-red-400' : 'fa-circle-check text-emerald-400'} text-lg"></i>
    <span>${escHtml(message)}</span>
  `;
  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
  }, 4500);
}

function applyData(data, sourceInfo) {
  allSessions = (data && data.sessions) || [];
  allExercises = (data && data.exercises) || [];
  muscleGroups = (data && data.muscle_groups) || window.HevyCore.ORDERED_MUSCLE_GROUPS;
  routineCategories = (data && data.routine_categories) || window.HevyCore.ORDERED_ROUTINES;
  exerciseMuscleMap = (data && data.exercise_muscle_map) || window.HevyCore.EXERCISE_MUSCLE_MAP;
  exerciseSecondaryMap = (data && data.exercise_secondary_map) || window.HevyCore.EXERCISE_SECONDARY_MUSCLES;
  defaultExerciseBalanceMap = (data && data.exercise_balance_map) || {};
  loadBalanceConfig();
  mergeBalanceMap();
  if (userBodyweightKg !== 75 || Object.keys(userBalanceOverrides).length > 0) {
    recalculateBalancedMetrics();
  }

  const hasData = allSessions.length > 0;
  const empty = document.getElementById('emptyState');
  if (empty) empty.style.display = hasData ? 'none' : '';

  const sourceStatusDot = document.createElement('span');
  sourceStatusDot.className = `inline-block w-2 h-2 rounded-full ${hasData ? 'bg-emerald-400' : 'bg-slate-500'}`;
  const sourceStatusText = document.createElement('span');
  sourceStatusText.textContent = hasData
    ? `${sourceInfo} • ${allSessions.length} sesiones`
    : 'Sin datos: sube tu CSV de Hevy';
  const sourceStatus = document.getElementById('sourceStatus');
  sourceStatus.textContent = '';
  sourceStatus.appendChild(sourceStatusDot);
  sourceStatus.appendChild(sourceStatusText);

  rebuildFilterDropdown();
  applyPresetRange('1w');

  if (filteredSessions.length > 0) {
    const lastIdx = filteredSessions.length - 1;
    showSessionDetail(filteredSessions[lastIdx], lastIdx);
  }
}

function handleFileUpload(e) {
  const input = e.target;
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = window.HevyCore.parseCsv(evt.target.result);
      if (!data.sessions.length) throw new Error('No se encontraron sesiones en el archivo');
      const modified = new Date(file.lastModified).toLocaleString('es-ES');
      applyData(data, `${file.name} (Modificado: ${modified})`);
      showToast('CSV procesado correctamente (todo en tu navegador)');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al procesar el archivo CSV', true);
    } finally {
      input.value = ''; // permite volver a subir el mismo archivo
    }
  };
  reader.onerror = () => showToast('No se pudo leer el archivo', true);
  reader.readAsText(file, 'utf-8');
}

function rebuildFilterDropdown() {
  const select = document.getElementById('mainFilterSelect');
  select.innerHTML = '';

  if (currentFilterType === 'all') {
    select.innerHTML = '<option value="ALL">Toda la sesión (Sin filtro)</option>';
  } else if (currentFilterType === 'muscle') {
    select.innerHTML = '<option value="ALL">Todos los Grupos Musculares</option>';
    muscleGroups.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `Grupo: ${m}`;
      select.appendChild(opt);
    });
  } else if (currentFilterType === 'routine') {
    select.innerHTML = '<option value="ALL">Todas las Rutinas</option>';
    routineCategories.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = `Rutina: ${r}`;
      select.appendChild(opt);
    });
  } else if (currentFilterType === 'exercise') {
    select.innerHTML = '<option value="ALL">Todos los Ejercicios</option>';
    const usageSessions = {};
    const usageSets = {};
    allSessions.forEach(s => {
      const grouped = s.grouped_exercises || {};
      Object.keys(grouped).forEach(ex => {
        usageSessions[ex] = (usageSessions[ex] || 0) + 1;
        usageSets[ex] = (usageSets[ex] || 0) + grouped[ex].length;
      });
    });
    const sortedExercises = [...allExercises].sort((a, b) => {
      const diffSess = (usageSessions[b] || 0) - (usageSessions[a] || 0);
      if (diffSess !== 0) return diffSess;
      const diffSets = (usageSets[b] || 0) - (usageSets[a] || 0);
      if (diffSets !== 0) return diffSets;
      return a.localeCompare(b);
    });
    sortedExercises.forEach(ex => {
      const opt = document.createElement('option');
      opt.value = ex;
      const count = usageSessions[ex] || 0;
      opt.textContent = `${ex} (${exerciseMuscleMap[ex] || 'Otro'} · ${count} ses.)`;
      select.appendChild(opt);
    });
  }
}

function setFilterDirectly(type, value) {
  currentFilterType = type;
  document.querySelectorAll('#filterTypeButtons button').forEach(b => {
    if (b.dataset.type === type) {
      b.className = "filter-type-btn active px-2.5 py-0.5 rounded-md bg-brand-600 text-white font-medium";
    } else {
      b.className = "filter-type-btn px-2.5 py-0.5 rounded-md bg-dark-850 text-zinc-400 hover:text-white font-medium";
    }
  });
  rebuildFilterDropdown();
  document.getElementById('mainFilterSelect').value = value;
  currentFilterValue = value;
  updateUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyPresetRange(preset) {
  if (!allSessions.length) return;
  const maxDt = new Date(allSessions[allSessions.length - 1].date_day);
  let startDt = new Date(maxDt);

  if (preset === '1w') {
    startDt.setDate(startDt.getDate() - 6);
  } else if (preset === '1m') {
    startDt.setMonth(startDt.getMonth() - 1);
  } else if (preset === '3m') {
    startDt.setMonth(startDt.getMonth() - 3);
  } else if (preset === '6m') {
    startDt.setMonth(startDt.getMonth() - 6);
  } else if (preset === '1y') {
    startDt.setFullYear(startDt.getFullYear() - 1);
  } else if (preset === 'all') {
    startDt = new Date(allSessions[0].date_day);
  }

  const format = (d) => d.toISOString().split('T')[0];
  document.getElementById('dateStart').value = format(startDt);
  document.getElementById('dateEnd').value = format(maxDt);

  document.querySelectorAll('.range-preset').forEach(b => {
    if (b.dataset.range === preset) {
      b.className = "range-preset active px-2.5 py-1 text-xs rounded-md bg-brand-600/20 border border-brand-500/40 text-brand-400 font-medium transition-colors";
    } else {
      b.className = "range-preset px-2.5 py-1 text-xs rounded-md bg-dark-850 hover:bg-dark-800 text-zinc-300 font-medium transition-colors";
    }
  });

  updateUI();
}

function stepWeek(direction) {
  const startEl = document.getElementById('dateStart');
  const endEl = document.getElementById('dateEnd');
  if (!startEl.value || !endEl.value) return;

  const startDt = new Date(startEl.value);
  const endDt = new Date(endEl.value);

  startDt.setDate(startDt.getDate() + (direction * 7));
  endDt.setDate(endDt.getDate() + (direction * 7));

  const format = (d) => d.toISOString().split('T')[0];
  startEl.value = format(startDt);
  endEl.value = format(endDt);

  clearPresetSelection();
  updateUI();
}

function clearPresetSelection() {
  document.querySelectorAll('.range-preset').forEach(b => {
    b.className = "range-preset px-2.5 py-1 text-xs rounded-md bg-dark-850 hover:bg-dark-800 text-zinc-300 font-medium transition-colors";
  });
}

function sessionMatchesFilter(s) {
  if (currentFilterType === 'muscle' && currentFilterValue !== 'ALL') {
    if (useFractionalSets) {
      return s.muscle_sets_fractional && s.muscle_sets_fractional[currentFilterValue] > 0;
    }
    return s.muscle_volumes && s.muscle_volumes[currentFilterValue] > 0;
  } else if (currentFilterType === 'routine' && currentFilterValue !== 'ALL') {
    return s.routine_category === currentFilterValue;
  } else if (currentFilterType === 'exercise' && currentFilterValue !== 'ALL') {
    return s.exercise_volumes && s.exercise_volumes.hasOwnProperty(currentFilterValue);
  }
  return true;
}

function filterSessions() {
  const startStr = document.getElementById('dateStart').value;
  const endStr = document.getElementById('dateEnd').value;

  filteredSessions = allSessions.filter(s => {
    if (startStr && s.date_day < startStr) return false;
    if (endStr && s.date_day > endStr) return false;
    return sessionMatchesFilter(s);
  });

  // Calculate previous period sessions of the exact same duration for comparison
  if (startStr && endStr) {
    const sDt = new Date(startStr);
    const eDt = new Date(endStr);
    const diffDays = Math.max(1, Math.round((eDt - sDt) / (1000 * 60 * 60 * 24)) + 1);

    const prevEndDt = new Date(sDt);
    prevEndDt.setDate(prevEndDt.getDate() - 1);
    const prevStartDt = new Date(prevEndDt);
    prevStartDt.setDate(prevStartDt.getDate() - (diffDays - 1));

    const prevStartStr = prevStartDt.toISOString().split('T')[0];
    const prevEndStr = prevEndDt.toISOString().split('T')[0];

    previousPeriodSessions = allSessions.filter(s => {
      if (s.date_day < prevStartStr || s.date_day > prevEndStr) return false;
      return sessionMatchesFilter(s);
    });
  } else {
    previousPeriodSessions = [];
  }
}

function updateUI() {
  filterSessions();
  updateKPIs();
  updateChartTitles();
  renderChart();
  renderBreakdownSection();
  renderMuscleRadarCharts();
  renderActivityCalendar();

  if (currentSessionIndex >= filteredSessions.length) {
    currentSessionIndex = filteredSessions.length - 1;
  }
  if (currentSessionIndex >= 0 && filteredSessions[currentSessionIndex]) {
    showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
  } else if (filteredSessions.length > 0) {
    currentSessionIndex = filteredSessions.length - 1;
    showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
  }
}

/**
 * Renders difference badge: % de mejora o empeoramiento
 */
function renderDiffBadge(currentVal, prevVal, isInteger = false, unit = '') {
  if (prevVal === 0) {
    if (currentVal > 0) {
      return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        <i class="fa-solid fa-sparkles"></i> Nuevo período
      </span>`;
    }
    return `<span class="text-slate-500 text-[10px]">Sin datos previos</span>`;
  }

  const diff = currentVal - prevVal;
  const pct = (diff / prevVal) * 100;
  const sign = pct > 0 ? '+' : '';
  const formattedPct = `${sign}${pct.toFixed(1)}%`;

  if (pct > 0.05) {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
      <i class="fa-solid fa-arrow-trend-up"></i> ${formattedPct} Mejora <span class="text-slate-400 font-normal">vs anterior (${isInteger ? Math.round(prevVal) : Math.round(prevVal).toLocaleString('es-ES')}${unit})</span>
    </span>`;
  } else if (pct < -0.05) {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
      <i class="fa-solid fa-arrow-trend-down"></i> ${formattedPct} Empeoramiento <span class="text-slate-400 font-normal">vs anterior (${isInteger ? Math.round(prevVal) : Math.round(prevVal).toLocaleString('es-ES')}${unit})</span>
    </span>`;
  } else {
    return `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-dark-800 text-slate-300 flex items-center gap-1">
      <i class="fa-solid fa-equals"></i> 0% Sin cambio <span class="text-slate-500 font-normal">vs anterior</span>
    </span>`;
  }
}

function parseLocalDay(dayStr) {
  return new Date(dayStr + 'T12:00:00');
}

function fmtLocalDay(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSessionBestOrm(s, isBal) {
  const oMap = (isBal ? s.balanced_exercise_max_orm : s.exercise_max_orm) || {};
  const vals = Object.values(oMap);
  return vals.length ? Math.max(...vals) : 0;
}

function getMuscleSumOrm(s, muscle, isBal) {
  const oMap = (isBal ? s.balanced_exercise_max_orm : s.exercise_max_orm) || {};
  let sum = 0;
  Object.keys(oMap).forEach(ex => {
    if ((exerciseMuscleMap[ex] || 'Otro') === muscle) {
      sum += oMap[ex] || 0;
    }
  });
  return roundOneDecimal(sum);
}

function getExerciseSumOrm(s, exName, isBal) {
  const sets = (s.grouped_exercises && s.grouped_exercises[exName]) || [];
  const sum = sets.reduce((acc, st) => acc + ((isBal ? st.balanced_1rm : st.estimated_1rm) || 0), 0);
  return roundOneDecimal(sum);
}

function getSessionMetricValueForMetric(s, metric, isBal) {
  if (currentFilterType === 'all' || currentFilterValue === 'ALL' || currentFilterType === 'routine') {
    if (metric === 'volume') return isBal ? s.balanced_total_volume : s.total_volume;
    if (metric === 'sets') return s.total_sets || 0;
    if (metric === 'pr_count') return s.pr_count;
    if (metric === 'sum_orm') return (isBal ? s.balanced_sum_orm : s.sum_orm) || 0;
    if (metric === 'best_orm') return getSessionBestOrm(s, isBal);
    if (metric === 'best_weight') return (isBal ? s.balanced_max_weight : s.max_weight) || 0;
  } else if (currentFilterType === 'muscle') {
    if (metric === 'volume') {
      const mMap = isBal
        ? (useFractionalSets ? s.balanced_muscle_volumes_fractional : s.balanced_muscle_volumes)
        : (useFractionalSets ? s.muscle_volumes_fractional : s.muscle_volumes);
      return (mMap && mMap[currentFilterValue]) || 0;
    }
    if (metric === 'sets') {
      const sMap = useFractionalSets ? s.muscle_sets_fractional : s.muscle_sets_direct;
      return (sMap && sMap[currentFilterValue]) || 0;
    }
    if (metric === 'pr_count') {
      return (s.prs_achieved && s.prs_achieved.filter(p => p.muscle_group === currentFilterValue).length) || 0;
    }
    if (metric === 'sum_orm') return getMuscleSumOrm(s, currentFilterValue, isBal);
    if (metric === 'best_orm') {
      const oMap = isBal ? s.balanced_muscle_max_orm : s.muscle_max_orm;
      return (oMap && oMap[currentFilterValue]) || 0;
    }
    if (metric === 'best_weight') {
      const wMap = isBal ? s.balanced_muscle_max_weight : s.muscle_max_weight;
      return (wMap && wMap[currentFilterValue]) || 0;
    }
  } else if (currentFilterType === 'exercise') {
    if (metric === 'volume') {
      const eMap = isBal ? s.balanced_exercise_volumes : s.exercise_volumes;
      return (eMap && eMap[currentFilterValue]) || 0;
    }
    if (metric === 'sets') {
      return (s.grouped_exercises && s.grouped_exercises[currentFilterValue]) ? s.grouped_exercises[currentFilterValue].length : 0;
    }
    if (metric === 'pr_count') {
      const hasPR = s.prs_achieved && s.prs_achieved.some(p => p.exercise === currentFilterValue);
      return hasPR ? 1 : 0;
    }
    if (metric === 'sum_orm') return getExerciseSumOrm(s, currentFilterValue, isBal);
    if (metric === 'best_orm') {
      const oMap = isBal ? s.balanced_exercise_max_orm : s.exercise_max_orm;
      return (oMap && oMap[currentFilterValue]) || 0;
    }
    if (metric === 'best_weight') {
      const wMap = isBal ? s.balanced_exercise_max_weight : s.exercise_max_weight;
      return (wMap && wMap[currentFilterValue]) || 0;
    }
  }
  return 0;
}

function computePeriodMetrics(sessions) {
  let totalVol = 0;
  let totalPRs = 0;
  let max1RM = 0;
  const isBal = statsMode === 'balanced';
  const defaultOrmMetric = (currentFilterType === 'muscle' || currentFilterType === 'exercise') && currentFilterValue !== 'ALL'
    ? 'best_orm'
    : 'sum_orm';
  const kpiOrmMetric = (activeMetric === 'sum_orm' || activeMetric === 'best_orm')
    ? activeMetric
    : defaultOrmMetric;

  sessions.forEach(s => {
    totalVol += getSessionMetricValueForMetric(s, 'volume', isBal) || 0;
    totalPRs += getSessionMetricValueForMetric(s, 'pr_count', isBal) || 0;
    const ormVal = getSessionMetricValueForMetric(s, kpiOrmMetric, isBal) || 0;
    if (ormVal > max1RM) max1RM = ormVal;
  });

  return { totalCount: sessions.length, totalVol, totalPRs, max1RM, kpiOrmMetric };
}

function updateKPIs() {
  const isBal = statsMode === 'balanced';
  const volUnit = isBal ? ' kg eq.' : ' kg';

  const curr = computePeriodMetrics(filteredSessions);
  const prev = computePeriodMetrics(previousPeriodSessions);
  const isBestOrm = curr.kpiOrmMetric === 'best_orm';
  const ormUnit = isBal ? ' kg eq.' : ' kg';

  document.getElementById('kpiSessions').textContent = curr.totalCount;
  let subLabel = 'sesiones en el período';
  if (currentFilterType === 'muscle' && currentFilterValue !== 'ALL') subLabel = `sesiones con ${currentFilterValue}`;
  else if (currentFilterType === 'routine' && currentFilterValue !== 'ALL') subLabel = `sesiones de ${currentFilterValue}`;
  else if (currentFilterType === 'exercise' && currentFilterValue !== 'ALL') subLabel = `sesiones con ${currentFilterValue}`;
  document.getElementById('kpiSessionsSub').textContent = subLabel;

  const avgVol = curr.totalCount > 0 ? Math.round(curr.totalVol / curr.totalCount) : 0;
  document.getElementById('kpiVolume').textContent = `${Math.round(curr.totalVol).toLocaleString('es-ES')}${volUnit}`;
  document.getElementById('kpiVolumeSub').textContent = `Promedio: ${avgVol.toLocaleString('es-ES')}${volUnit} / sesión`;

  document.getElementById('kpiPRs').textContent = curr.totalPRs;
  document.getElementById('kpiPRsSub').textContent = 'Récords personales conseguidos';

  document.getElementById('kpiTopRM').textContent = `${curr.max1RM.toFixed(1)}${ormUnit}`;
  document.getElementById('kpiTopRMSub').textContent = isBestOrm
    ? (isBal ? 'Mejor 1RM equiv. en el filtro' : 'Mejor 1RM en el filtro')
    : (isBal
      ? (currentFilterType === 'exercise' && currentFilterValue !== 'ALL' ? 'Suma máx. de 1RM eq. (series)' : 'Suma máx. de 1RM eq. en sesión')
      : (currentFilterType === 'exercise' && currentFilterValue !== 'ALL' ? 'Suma máx. de 1RM (series)' : 'Suma máx. de 1RM en sesión'));

  document.getElementById('kpiSessionsDiff').innerHTML = renderDiffBadge(curr.totalCount, prev.totalCount, true);
  document.getElementById('kpiVolumeDiff').innerHTML = renderDiffBadge(curr.totalVol, prev.totalVol, false, volUnit);
  document.getElementById('kpiPRsDiff').innerHTML = renderDiffBadge(curr.totalPRs, prev.totalPRs, true);
  document.getElementById('kpiTopRMDiff').innerHTML = renderDiffBadge(curr.max1RM, prev.max1RM, false, ormUnit);
}

function updateChartTitles() {
  const titleEl = document.getElementById('chartTitle');
  const isBal = statsMode === 'balanced';
  const unit = isBal ? 'kg eq.' : 'kg';
  const fracBadge = (currentFilterType === 'muscle' && currentFilterValue !== 'ALL')
    ? (useFractionalSets ? ' (Fraccionario 0.5x)' : ' (Directo 1.0x)')
    : '';
  let filterLabel = 'por Sesión';
  if (currentFilterType === 'muscle' && currentFilterValue !== 'ALL') filterLabel = `en ${escHtml(currentFilterValue)}${fracBadge}`;
  else if (currentFilterType === 'routine' && currentFilterValue !== 'ALL') filterLabel = `en ${escHtml(currentFilterValue)}`;
  else if (currentFilterType === 'exercise' && currentFilterValue !== 'ALL') filterLabel = `en ${escHtml(currentFilterValue)}`;

  if (activeMetric === 'volume') {
    titleEl.innerHTML = `<i class="fa-solid fa-dumbbell text-brand-400 mr-1.5"></i> ${isBal ? 'Volumen Equivalente' : 'Volumen Total'} ${filterLabel} (${unit})`;
  } else if (activeMetric === 'sets') {
    titleEl.innerHTML = `<i class="fa-solid fa-layer-group text-cyan-400 mr-1.5"></i> Series Realizadas ${filterLabel}`;
  } else if (activeMetric === 'pr_count') {
    titleEl.innerHTML = `<i class="fa-solid fa-trophy text-amber-400 mr-1.5"></i> RMs / PRs Conseguidos ${filterLabel}`;
  } else if (activeMetric === 'sum_orm') {
    const ormLabel = isBal ? '1RM Equiv. (kg eq.)' : '1RM Estimado (kg)';
    const seriesHint = (currentFilterType === 'exercise' && currentFilterValue !== 'ALL') ? ' (series)' : '';
    titleEl.innerHTML = `<i class="fa-solid fa-bolt text-purple-400 mr-1.5"></i> Suma de ${ormLabel}${seriesHint} ${filterLabel}`;
  } else if (activeMetric === 'best_orm') {
    const ormLabel = isBal ? '1RM Equiv. (kg eq.)' : '1RM Estimado (kg)';
    titleEl.innerHTML = `<i class="fa-solid fa-crown text-violet-400 mr-1.5"></i> Serie con Mejor ${ormLabel} ${filterLabel}`;
  } else if (activeMetric === 'best_weight') {
    titleEl.innerHTML = `<i class="fa-solid fa-weight-hanging text-rose-400 mr-1.5"></i> Serie con Mejor Peso ${isBal ? 'Equiv. ' : ''}${filterLabel} (${unit})`;
  }
}

function getSessionMetricValue(s) {
  return getSessionMetricValueForMetric(s, activeMetric, statsMode === 'balanced');
}

function renderChart() {
  const ctx = document.getElementById('workoutChart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const labels = filteredSessions.map(s => {
    const parts = s.date_day.split('-');
    if (parts.length === 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${SPANISH_MONTH_NAMES[mIdx]} '${parts[0].slice(2)}`;
    }
    return s.date_day;
  });

  const dataValues = filteredSessions.map(s => getSessionMetricValue(s));

  let primaryColor = '#3b82f6';
  let primaryBg = 'rgba(59, 130, 246, 0.15)';
  let primaryBorder = '#60a5fa';

  if (currentFilterType === 'muscle' && MUSCLE_COLORS[currentFilterValue]) {
    const c = MUSCLE_COLORS[currentFilterValue];
    primaryColor = c.bg;
    primaryBg = c.light;
    primaryBorder = c.border;
  } else if (currentFilterType === 'routine' && ROUTINE_COLORS[currentFilterValue]) {
    const c = ROUTINE_COLORS[currentFilterValue];
    primaryColor = c.bg;
    primaryBg = c.light;
    primaryBorder = c.border;
  } else {
    if (activeMetric === 'pr_count') {
      primaryColor = '#f59e0b';
      primaryBg = 'rgba(245, 158, 11, 0.2)';
      primaryBorder = '#fbbf24';
    } else if (activeMetric === 'sum_orm') {
      primaryColor = '#a855f7';
      primaryBg = 'rgba(168, 85, 247, 0.2)';
      primaryBorder = '#c084fc';
    } else if (activeMetric === 'best_orm') {
      primaryColor = '#8b5cf6';
      primaryBg = 'rgba(139, 92, 246, 0.2)';
      primaryBorder = '#a78bfa';
    } else if (activeMetric === 'best_weight') {
      primaryColor = '#f43f5e';
      primaryBg = 'rgba(244, 63, 94, 0.2)';
      primaryBorder = '#fb7185';
    }
  }

  const pointColors = filteredSessions.map((s, idx) => {
    if (idx === currentSessionIndex) return '#ffffff';
    if (s.pr_count > 0) return '#f59e0b';
    return primaryColor;
  });

  const pointRadius = filteredSessions.map((s, idx) => {
    if (idx === currentSessionIndex) return 8;
    if (s.pr_count > 0) return 5;
    return filteredSessions.length > 80 ? 3 : 4;
  });

  const pointBorderWidth = filteredSessions.map((s, idx) => {
    if (idx === currentSessionIndex) return 3;
    if (s.pr_count > 0) return 2;
    return 1;
  });

  const isBal = statsMode === 'balanced';
  let metricUnit = isBal ? ' kg eq.' : ' kg';
  let datasetLabel = isBal ? 'Volumen Eq. (kg eq.)' : 'Volumen (kg)';
  if (activeMetric === 'volume') {
    metricUnit = isBal ? ' kg eq.' : ' kg';
  } else if (activeMetric === 'sets') {
    metricUnit = ' series';
    datasetLabel = 'Series';
  } else if (activeMetric === 'pr_count') {
    metricUnit = ' RMs';
    datasetLabel = 'RMs Conseguidos';
  } else if (activeMetric === 'sum_orm') {
    metricUnit = isBal ? ' kg eq.' : ' kg';
    datasetLabel = isBal ? 'Suma de 1RM Eq. (kg eq.)' : 'Suma de 1RM (kg)';
  } else if (activeMetric === 'best_orm') {
    metricUnit = isBal ? ' kg eq.' : ' kg';
    datasetLabel = isBal ? 'Mejor 1RM Eq. (kg eq.)' : 'Mejor 1RM (kg)';
  } else if (activeMetric === 'best_weight') {
    metricUnit = isBal ? ' kg eq.' : ' kg';
    datasetLabel = isBal ? 'Mejor Peso Eq. (kg eq.)' : 'Mejor Peso (kg)';
  }

  chartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        _baseColor: primaryColor,
        label: datasetLabel,
        data: dataValues,
        borderColor: primaryBorder,
        backgroundColor: chartType === 'line' ? primaryBg : primaryColor,
        borderWidth: chartType === 'line' ? 2.5 : 1,
        fill: chartType === 'line',
        tension: 0.25,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#000000',
        pointBorderWidth: pointBorderWidth,
        pointRadius: pointRadius,
        pointHoverRadius: 9,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: primaryColor,
        pointHoverBorderWidth: 3,
        borderRadius: chartType === 'bar' ? 4 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      onClick: (e, activeElements) => {
        if (activeElements.length > 0) {
          const idx = activeElements[0].index;
          currentSessionIndex = idx;
          showSessionDetail(filteredSessions[idx], idx);
          highlightSelectedPoint();
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#121215',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#26262c',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const s = filteredSessions[idx];
              return `${s.title} • ${s.routine_category} • ${s.date_iso}`;
            },
            label: (item) => {
              const idx = item.dataIndex;
              const s = filteredSessions[idx];
              let lines = [`${item.dataset.label}: ${item.raw.toLocaleString('es-ES')}${metricUnit}`];
              if (s.description) {
                lines.push(`Nota: "${s.description.slice(0, 45)}${s.description.length > 45 ? '...' : ''}"`);
              }
              if (s.pr_count > 0) {
                lines.push(`${s.pr_count} récord(s) batido(s)`);
              }
              return lines;
            },
            afterBody: () => '👉 Haz clic para ver el detalle completo'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
            tickColor: 'transparent'
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            maxRotation: 45,
            autoSkip: true,
            maxTicksLimit: 14
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
            tickColor: 'transparent'
          },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (val) => activeMetric === 'pr_count' ? val : `${val.toLocaleString('es-ES')}${metricUnit}`
          }
        }
      }
    }
  });
}

function highlightSelectedPoint() {
  if (!chartInstance) return;
  const ds = chartInstance.data.datasets[0];
  ds.pointRadius = filteredSessions.map((s, idx) => {
    if (idx === currentSessionIndex) return 9;
    if (s.pr_count > 0) return 5;
    return filteredSessions.length > 80 ? 3 : 4;
  });
  ds.pointBackgroundColor = filteredSessions.map((s, idx) => {
    if (idx === currentSessionIndex) return '#ffffff';
    if (s.pr_count > 0) return '#f59e0b';
    return ds._baseColor || '#3b82f6';
  });
  chartInstance.update('none');
}

/**
 * Breakdown Section: Routine vs Muscle Group with Fractional Sets & Period Comparison
 */
function renderBreakdownSection() {
  const isMuscle = currentBreakdownView === 'muscle';
  const isBal = statsMode === 'balanced';
  const volUnit = isBal ? 'kg eq.' : 'kg';
  const categories = isMuscle ? muscleGroups : routineCategories;
  const colorMap = isMuscle ? MUSCLE_COLORS : ROUTINE_COLORS;

  const stats = {};
  categories.forEach(c => {
    stats[c] = {
      name: c,
      volume: 0,
      directSets: 0,
      fractionalSets: 0.0,
      prs: 0,
      exercises: {},
      sessionsCount: 0,
      prevVolume: 0,
      prevDirectSets: 0,
      prevFractionalSets: 0.0
    };
  });

  let totalPeriodVolume = 0;

  // Current period aggregation
  filteredSessions.forEach(s => {
    const sessVol = isBal ? (s.balanced_total_volume || 0) : (s.total_volume || 0);
    totalPeriodVolume += sessVol;

    if (!isMuscle) {
      const r = s.routine_category || 'General / Otro';
      if (!stats[r]) {
        stats[r] = { name: r, volume: 0, directSets: 0, fractionalSets: 0.0, prs: 0, exercises: {}, sessionsCount: 0, prevVolume: 0, prevDirectSets: 0, prevFractionalSets: 0.0 };
      }
      stats[r].volume += sessVol;
      stats[r].directSets += s.total_sets;
      stats[r].fractionalSets += s.total_sets;
      stats[r].prs += s.pr_count;
      stats[r].sessionsCount++;
      
      s.sets.forEach(st => {
        const ex = st.exercise_title;
        stats[r].exercises[ex] = Math.max(stats[r].exercises[ex] || 0, st.estimated_1rm);
      });
    } else {
      s.sets.forEach(st => {
        const m = st.muscle_group || 'Otro';
        const stVol = isBal ? (st.balanced_volume || 0) : (st.volume_kg || 0);
        if (!stats[m]) {
          stats[m] = { name: m, volume: 0, directSets: 0, fractionalSets: 0.0, prs: 0, exercises: {}, sessionsCount: 0, prevVolume: 0, prevDirectSets: 0, prevFractionalSets: 0.0 };
        }
        stats[m].volume += stVol;
        stats[m].directSets += 1;
        stats[m].fractionalSets = roundOneDecimal(stats[m].fractionalSets + 1.0);
        if (st.is_pr) stats[m].prs += 1;

        const ex = st.exercise_title;
        stats[m].exercises[ex] = Math.max(stats[m].exercises[ex] || 0, st.estimated_1rm);

        // Synergist secondary muscles fractional addition
        if (st.secondary_muscles) {
          st.secondary_muscles.forEach(([mSec, w]) => {
            if (!stats[mSec]) {
              stats[mSec] = { name: mSec, volume: 0, directSets: 0, fractionalSets: 0.0, prs: 0, exercises: {}, sessionsCount: 0, prevVolume: 0, prevDirectSets: 0, prevFractionalSets: 0.0 };
            }
            stats[mSec].fractionalSets = roundOneDecimal(stats[mSec].fractionalSets + w);
          });
        }
      });
    }
  });

  // Previous period aggregation for comparative progress (% mejora / empeoramiento)
  previousPeriodSessions.forEach(s => {
    const sessVol = isBal ? (s.balanced_total_volume || 0) : (s.total_volume || 0);
    if (!isMuscle) {
      const r = s.routine_category || 'General / Otro';
      if (stats[r]) {
        stats[r].prevVolume += sessVol;
        stats[r].prevDirectSets += s.total_sets;
        stats[r].prevFractionalSets += s.total_sets;
      }
    } else {
      s.sets.forEach(st => {
        const m = st.muscle_group || 'Otro';
        const stVol = isBal ? (st.balanced_volume || 0) : (st.volume_kg || 0);
        if (stats[m]) {
          stats[m].prevVolume += stVol;
          stats[m].prevDirectSets += 1;
          stats[m].prevFractionalSets = roundOneDecimal(stats[m].prevFractionalSets + 1.0);
        }
        if (st.secondary_muscles) {
          st.secondary_muscles.forEach(([mSec, w]) => {
            if (stats[mSec]) {
              stats[mSec].prevFractionalSets = roundOneDecimal(stats[mSec].prevFractionalSets + w);
            }
          });
        }
      });
    }
  });

  // Sort by volume descending
  const sortedStats = Object.values(stats)
    .filter(st => st.volume > 0 || st.directSets > 0 || st.fractionalSets > 0)
    .sort((a, b) => b.volume - a.volume);

  // Subtitle
  const subTitleEl = document.getElementById('breakdownBarSubtitle');
  if (subTitleEl) {
    const fracStr = isMuscle && useFractionalSets ? 'Series Fraccionarias' : 'Series Directas';
    const modeStr = isBal ? 'Equilibrada (kg eq.)' : 'Bruto (kg)';
    subTitleEl.textContent = `(${fracStr} • ${modeStr})`;
  }

  // Update Doughnut Chart
  renderDonutChart(sortedStats, totalPeriodVolume, colorMap, volUnit);

  // Update Bar Chart
  renderBarChart(sortedStats, colorMap, volUnit);

  // Update Cards Grid
  renderCardsGrid(sortedStats, totalPeriodVolume, colorMap, isMuscle, volUnit);
}

function roundOneDecimal(num) {
  return Math.round(num * 10) / 10;
}

function renderDonutChart(sortedStats, totalVol, colorMap, volUnit = 'kg') {
  const ctx = document.getElementById('breakdownDonutChart').getContext('2d');
  if (donutChartInstance) donutChartInstance.destroy();

  const labels = sortedStats.map(s => s.name);
  const data = sortedStats.map(s => s.volume);
  const bgColors = sortedStats.map(s => (colorMap[s.name] ? colorMap[s.name].bg : '#64748b'));

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderColor: '#000000',
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { size: 10 },
            boxWidth: 10,
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: '#121215',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#26262c',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => {
              const val = item.raw;
              const pct = totalVol > 0 ? ((val / totalVol) * 100).toFixed(1) : 0;
              return ` ${item.label}: ${Math.round(val).toLocaleString('es-ES')} ${volUnit} (${pct}%)`;
            }
          }
        }
      },
      cutout: '68%'
    }
  });
}

function renderBarChart(sortedStats, colorMap, volUnit = 'kg') {
  const ctx = document.getElementById('breakdownBarChart').getContext('2d');
  if (barChartInstance) barChartInstance.destroy();

  const labels = sortedStats.map(s => s.name);
  const data = sortedStats.map(s => s.volume);
  const bgColors = sortedStats.map(s => (colorMap[s.name] ? colorMap[s.name].bg : '#64748b'));

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#121215',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#26262c',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => ` ${volUnit === 'kg eq.' ? 'Volumen Eq.' : 'Volumen'}: ${Math.round(item.raw).toLocaleString('es-ES')} ${volUnit}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.06)', tickColor: 'transparent' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (v) => `${(v / 1000).toFixed(0)}k ${volUnit}`
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#ffffff', font: { size: 11, weight: 'bold' } }
        }
      }
    }
  });
}

function renderCardsGrid(sortedStats, totalVol, colorMap, isMuscle, volUnit = 'kg') {
  const grid = document.getElementById('breakdownCardsGrid');
  grid.innerHTML = '';

  sortedStats.forEach(st => {
    const c = colorMap[st.name] || { bg: "#64748b", border: "#94a3b8", text: "text-slate-300", light: "rgba(100, 116, 139, 0.15)" };
    const pct = totalVol > 0 ? ((st.volume / totalVol) * 100).toFixed(1) : 0;

    // Sets count display (direct vs fractional)
    let setsDisplayHtml = '';
    if (isMuscle && useFractionalSets) {
      const indirect = roundOneDecimal(st.fractionalSets - st.directSets);
      setsDisplayHtml = `
        <div class="text-xs text-slate-300">
          <strong class="text-white text-sm">${st.fractionalSets.toFixed(1)}</strong> series efectivas
          ${indirect > 0 ? `<span class="text-[10px] text-brand-300 block">(${st.directSets} directas + ${indirect.toFixed(1)} indirectas)</span>` : `<span class="text-[10px] text-slate-500 block">(${st.directSets} directas)</span>`}
        </div>
      `;
    } else {
      setsDisplayHtml = `
        <div class="text-xs text-slate-300">
          <strong class="text-white text-sm">${st.directSets}</strong> series directas
        </div>
      `;
    }

    // Comparison with previous period (% de mejora / empeoramiento)
    let comparisonHtml = '';
    if (st.prevVolume > 0) {
      const diffVol = st.volume - st.prevVolume;
      const pctChange = (diffVol / st.prevVolume) * 100;
      const isPositive = pctChange > 0.05;
      const isNegative = pctChange < -0.05;
      const sign = isPositive ? '+' : '';

      comparisonHtml = `
        <div class="mt-2 pt-2 border-t border-dark-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Progreso vs ant.:</span>
          <span class="font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : (isNegative ? 'text-rose-400' : 'text-slate-400')}">
            <i class="fa-solid ${isPositive ? 'fa-arrow-trend-up' : (isNegative ? 'fa-arrow-trend-down' : 'fa-equals')}"></i>
            ${sign}${pctChange.toFixed(1)}% ${isPositive ? 'Mejora' : (isNegative ? 'Empeora' : '')}
          </span>
        </div>
      `;
    } else if (st.volume > 0 && st.prevVolume === 0) {
      comparisonHtml = `
        <div class="mt-2 pt-2 border-t border-dark-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Progreso vs ant.:</span>
          <span class="font-bold text-emerald-400 text-[10px]">
            <i class="fa-solid fa-sparkles"></i> Nuevo estímulo
          </span>
        </div>
      `;
    }

    // Top 3 exercises by max 1RM
    const topExercises = Object.entries(st.exercises)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const card = document.createElement('div');
    card.className = "bg-dark-950/80 border border-dark-800 rounded-xl p-4 flex flex-col justify-between hover:border-dark-700 transition-all shadow-sm";
    card.style.borderLeftWidth = "4px";
    card.style.borderLeftColor = c.bg;

    let exRowsHtml = topExercises.map(([ex, orm]) => `
      <div class="flex items-center justify-between text-[11px] text-slate-400 py-0.5">
        <span class="truncate max-w-[150px] text-slate-300" title="${escHtml(ex)}">${escHtml(ex)}</span>
        <span class="font-semibold text-purple-300">${orm > 0 ? orm + ' kg' : '-'}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-white flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${c.bg}"></span>
            ${escHtml(st.name)}
          </span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background-color: ${c.light}; color: ${c.border}">
            ${pct}%
          </span>
        </div>

        <div class="text-xl font-black text-white mt-1">
          ${Math.round(st.volume).toLocaleString('es-ES')} <span class="text-xs font-normal text-slate-400">${volUnit}</span>
        </div>

        <div class="mt-2 flex flex-col gap-1 pb-2 border-b border-dark-800/80">
          ${setsDisplayHtml}
          <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span><strong class="text-amber-400">${st.prs}</strong> RMs batidos</span>
            ${!isMuscle ? `<span><strong class="text-blue-400">${st.sessionsCount}</strong> sesiones</span>` : ''}
          </div>
        </div>

        ${comparisonHtml}

        ${topExercises.length > 0 ? `
          <div class="mt-2.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">Ejercicios Destacados (1RM)</span>
            ${exRowsHtml}
          </div>
        ` : ''}
      </div>

      <button type="button" class="js-card-filter-btn mt-4 w-full py-1.5 px-3 rounded-lg bg-dark-900 hover:bg-dark-800 text-xs font-semibold text-slate-300 border border-dark-800 hover:border-dark-700 transition-colors flex items-center justify-center gap-1.5"
        data-filter-type="${isMuscle ? 'muscle' : 'routine'}" data-filter-val="${escHtml(st.name)}">
        <i class="fa-solid fa-arrow-trend-up text-brand-400"></i>
        <span>Ver evolución en gráfica</span>
      </button>
    `;
    card.querySelector('.js-card-filter-btn')?.addEventListener('click', () => {
      setFilterDirectly(isMuscle ? 'muscle' : 'routine', st.name);
    });

    grid.appendChild(card);
  });
}

function showSessionDetail(s, index) {
  if (!s) return;
  currentSessionIndex = index;

  // Session tag
  const tag = document.getElementById('selectedSessionTag');
  const tagName = document.getElementById('selectedSessionTagName');
  tag.classList.remove('hidden');
  tagName.textContent = `${s.title} (${s.date_day})`;

  // Header
  document.getElementById('detailTitle').textContent = s.title;
  document.getElementById('detailDateTime').innerHTML = `
    <i class="fa-regular fa-calendar"></i> ${escHtml(s.date_iso)} 
    ${s.duration_min > 0 ? `&bull; <i class="fa-regular fa-clock ml-2"></i> ${s.duration_min} minutos` : ''}
  `;

  // PR Badge
  const badge = document.getElementById('detailBadge');
  if (s.pr_count > 0) {
    badge.classList.remove('hidden');
    badge.textContent = `${s.pr_count} Nuevo(s) RM`;
  } else {
    badge.classList.add('hidden');
  }

  // Routine Category Badge
  const routineBadge = document.getElementById('detailRoutineBadge');
  if (s.routine_category) {
    routineBadge.classList.remove('hidden');
    routineBadge.textContent = s.routine_category;
  } else {
    routineBadge.classList.add('hidden');
  }

  // Navigation
  document.getElementById('detailNav').classList.remove('hidden');
  document.getElementById('btnPrevSession').disabled = index <= 0;
  document.getElementById('btnNextSession').disabled = index >= filteredSessions.length - 1;

  // Description
  const descBox = document.getElementById('detailDescBox');
  if (s.description && s.description.trim() !== '') {
    descBox.classList.remove('hidden');
    document.getElementById('detailDescription').textContent = s.description;
  } else {
    descBox.classList.add('hidden');
  }

  // Stats row
  const isBal = statsMode === 'balanced';
  const unit = isBal ? 'kg eq.' : 'kg';
  const sessVol = isBal ? (s.balanced_total_volume || 0) : (s.total_volume || 0);
  const sessSumOrm = isBal ? (s.balanced_sum_orm || 0) : (s.sum_orm || 0);

  document.getElementById('detailStatsRow').classList.remove('hidden');
  document.getElementById('detailVol').textContent = `${Math.round(sessVol).toLocaleString('es-ES')} ${unit}`;
  document.getElementById('detailDuration').textContent = s.duration_min > 0 ? `${s.duration_min} min` : 'N/D';
  document.getElementById('detailSetsReps').textContent = `${s.total_sets} series / ${s.total_reps} reps`;
  document.getElementById('detailSumORM').textContent = `${sessSumOrm.toFixed(1)} ${unit}`;

  // Exercises List
  const container = document.getElementById('detailExercisesList');
  container.innerHTML = '';

  const grouped = s.grouped_exercises || {};
  const exerciseNames = Object.keys(grouped);

  if (exerciseNames.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-slate-500">No hay series registradas en esta sesión.</div>';
    return;
  }

  exerciseNames.forEach((exName, exIdx) => {
    const sets = grouped[exName];
    const exVol = isBal
      ? ((s.balanced_exercise_volumes && s.balanced_exercise_volumes[exName]) || 0)
      : ((s.exercise_volumes && s.exercise_volumes[exName]) || 0);
    const exORM = isBal
      ? ((s.balanced_exercise_max_orm && s.balanced_exercise_max_orm[exName]) || 0)
      : ((s.exercise_max_orm && s.exercise_max_orm[exName]) || 0);
    const exMaxW = isBal
      ? ((s.balanced_exercise_max_weight && s.balanced_exercise_max_weight[exName]) || 0)
      : ((s.exercise_max_weight && s.exercise_max_weight[exName]) || 0);
    const muscle = exerciseMuscleMap[exName] || 'Otro';
    const mColor = MUSCLE_COLORS[muscle] || { text: 'text-slate-400', light: 'rgba(100, 116, 139, 0.15)' };
    const secondaries = exerciseSecondaryMap[exName] || [];
    
    const prInfo = s.prs_achieved && s.prs_achieved.find(p => p.exercise === exName);

    const card = document.createElement('div');
    card.className = "bg-dark-950/60 border border-dark-800 rounded-xl overflow-hidden";

    let rowsHtml = sets.map((st, i) => {
      let badgeClass = 'badge-normal';
      let typeLabel = 'Normal';
      if (st.set_type === 'warmup') { badgeClass = 'badge-warmup'; typeLabel = 'Calent.'; }
      else if (st.set_type === 'drop') { badgeClass = 'badge-drop'; typeLabel = 'Drop'; }
      else if (st.set_type === 'failure') { badgeClass = 'badge-failure'; typeLabel = 'Fallo'; }

      let prBadgeHtml = '';
      if (st.is_pr) {
        prBadgeHtml = `<span class="badge-pr text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 inline-flex items-center gap-1 shadow-sm"><i class="fa-solid fa-trophy"></i> PR</span>`;
      }

      const dispW = isBal ? (st.balanced_weight || 0) : st.weight_kg;
      const dispOrm = isBal ? (st.balanced_1rm || 0) : st.estimated_1rm;
      const dispVol = isBal ? (st.balanced_volume || 0) : st.volume_kg;
      const rawNoteHtml = isBal ? ` <span class="text-[10px] text-slate-500 font-normal">(${st.weight_kg} kg)</span>` : '';

      return `
        <tr class="border-b border-dark-800/50 hover:bg-dark-900/60 transition-colors text-xs">
          <td class="py-2.5 px-3 text-slate-400 font-mono font-medium">${i + 1}</td>
          <td class="py-2.5 px-3">
            <span class="${badgeClass} px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">${typeLabel}</span>
            ${prBadgeHtml}
          </td>
          <td class="py-2.5 px-3 font-bold text-white">${dispW} <span class="${isBal ? 'text-cyan-400' : 'text-slate-400'} font-normal">${unit}</span>${rawNoteHtml}</td>
          <td class="py-2.5 px-3 font-bold text-slate-200">${st.reps} <span class="text-slate-400 font-normal">reps</span></td>
          <td class="py-2.5 px-3 font-semibold text-purple-300">${dispOrm > 0 ? dispOrm + ' ' + unit : '-'}</td>
          <td class="py-2.5 px-3 text-emerald-400 font-medium">${Math.round(dispVol).toLocaleString('es-ES')} ${unit}</td>
          <td class="py-2.5 px-3 text-slate-400 text-[11px] italic">${st.rpe ? `RPE ${st.rpe} ` : ''}${st.exercise_notes ? `"${st.exercise_notes}"` : '-'}</td>
        </tr>
      `;
    }).join('');

    let secBadgesHtml = secondaries.map(([mSec, w]) => 
      `<span class="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-slate-400" title="Músculo sinergista">+${w} ${mSec}</span>`
    ).join(' ');

    card.innerHTML = `
      <div class="px-4 py-3 bg-dark-900/80 border-b border-dark-800 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold font-mono">
            ${exIdx + 1}
          </span>
          <h4 class="font-bold text-sm text-white">${escHtml(exName)}</h4>
          <span class="px-2 py-0.5 text-[11px] rounded-md font-medium" style="background-color: ${mColor.light}; color: ${mColor.border}">
            ${muscle}
          </span>
          ${secBadgesHtml}
          ${prInfo ? `<span class="badge-pr text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"><i class="fa-solid fa-trophy"></i> Nuevo RM: ${prInfo.new_orm} kg! (previo: ${prInfo.prev_best} kg)</span>` : ''}
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span>Volumen: <strong class="text-emerald-400">${Math.round(exVol).toLocaleString('es-ES')} ${unit}</strong></span>
          <span>Mejor Peso: <strong class="text-rose-400">${exMaxW} ${unit}</strong></span>
          <span>Mejor 1RM: <strong class="text-purple-400">${exORM} ${unit}</strong></span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-dark-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-dark-800">
              <th class="py-2 px-3">#</th>
              <th class="py-2 px-3">Tipo</th>
              <th class="py-2 px-3">Peso</th>
              <th class="py-2 px-3">Reps</th>
              <th class="py-2 px-3">1RM Est.</th>
              <th class="py-2 px-3">Volumen</th>
              <th class="py-2 px-3">RPE / Notas</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(card);
  });
}
window.setFilterDirectly = setFilterDirectly;

/**
 * Muscle Group Radar Charts (Reps & Volume, Current vs Previous Period)
 */
function renderMuscleRadarCharts() {
  const repsCanvas = document.getElementById('radarRepsChart');
  const volCanvas = document.getElementById('radarVolumeChart');
  if (!repsCanvas || !volCanvas) return;

  if (radarRepsChartInstance) radarRepsChartInstance.destroy();
  if (radarVolumeChartInstance) radarVolumeChartInstance.destroy();

  const periodSel = document.getElementById('radarPeriodSelect');
  const periodVal = periodSel ? periodSel.value : '30';

  let currSessions = [];
  let prevSessions = [];
  let currLabel = 'Período actual';
  let prevLabel = 'Período anterior';
  let anchorText = '';

  if (!allSessions.length) return;

  if (periodVal === 'filter') {
    currSessions = filteredSessions;
    prevSessions = previousPeriodSessions;
    currLabel = 'Rango actual';
    prevLabel = 'Rango anterior';
    const endVal = document.getElementById('dateEnd')?.value;
    if (endVal) anchorText = ` · ANCLADO A ${endVal}`;
  } else {
    const days = parseInt(periodVal, 10) || 30;
    const maxDay = allSessions[allSessions.length - 1].date_day;
    const anchorDt = parseLocalDay(maxDay);
    const currStartDt = new Date(anchorDt);
    currStartDt.setDate(currStartDt.getDate() - (days - 1));
    const prevEndDt = new Date(currStartDt);
    prevEndDt.setDate(prevEndDt.getDate() - 1);
    const prevStartDt = new Date(prevEndDt);
    prevStartDt.setDate(prevStartDt.getDate() - (days - 1));

    const currStartStr = fmtLocalDay(currStartDt);
    const prevStartStr = fmtLocalDay(prevStartDt);
    const prevEndStr = fmtLocalDay(prevEndDt);

    currSessions = allSessions.filter(s => s.date_day >= currStartStr && s.date_day <= maxDay);
    prevSessions = allSessions.filter(s => s.date_day >= prevStartStr && s.date_day <= prevEndStr);

    currLabel = `Últimos ${days} días`;
    prevLabel = `${days} días anteriores`;
    const parts = maxDay.split('-');
    if (parts.length === 3) {
      anchorText = ` · ANCLADO A ${parseInt(parts[2], 10)} ${SPANISH_MONTH_NAMES[parseInt(parts[1], 10) - 1].toUpperCase()}`;
    }
  }

  const legCurr = document.getElementById('radarLegendCurrent');
  const legPrev = document.getElementById('radarLegendPrev');
  const subEl = document.getElementById('radarSubtitle');
  if (legCurr) legCurr.textContent = currLabel;
  if (legPrev) legPrev.textContent = prevLabel;
  if (subEl) {
    const modeLabel = useFractionalSets ? 'SERIES EFECTIVAS (0.5x)' : 'SERIES DIRECTAS (1.0x)';
    subEl.textContent = `${modeLabel} · BRILLANTE = ${currLabel.toUpperCase()}, OSCURO = ${prevLabel.toUpperCase()}${anchorText}`;
  }

  const axes = ['Pecho', 'Espalda', 'Pierna', 'Brazos', 'Hombro', 'Abdomen'];
  const mapMuscleToAxis = (m) => {
    if (m === 'Bíceps' || m === 'Tríceps') return 'Brazos';
    if (axes.includes(m)) return m;
    return null;
  };

  const isBal = statsMode === 'balanced';
  const aggregateRadar = (sessions) => {
    const reps = Object.fromEntries(axes.map(a => [a, 0]));
    const vol = Object.fromEntries(axes.map(a => [a, 0]));
    sessions.forEach(s => {
      (s.sets || []).forEach(st => {
        if (st.set_type === 'warmup') return;
        const stVol = (isBal ? st.balanced_volume : st.volume_kg) || 0;
        const primaryAxis = mapMuscleToAxis(st.muscle_group);
        if (primaryAxis) {
          reps[primaryAxis] += st.reps || 0;
          vol[primaryAxis] += stVol;
        }
        if (useFractionalSets && st.secondary_muscles) {
          st.secondary_muscles.forEach(([mSec, w]) => {
            const secAxis = mapMuscleToAxis(mSec);
            if (secAxis) {
              reps[secAxis] += (st.reps || 0) * w;
              vol[secAxis] += stVol * w;
            }
          });
        }
      });
    });
    return {
      reps: axes.map(a => Math.round(reps[a])),
      vol: axes.map(a => Math.round(vol[a]))
    };
  };

  const currData = aggregateRadar(currSessions);
  const prevData = aggregateRadar(prevSessions);

  const buildRadarConfig = (currArr, prevArr, unit) => ({
    type: 'radar',
    data: {
      labels: axes,
      datasets: [
        {
          label: currLabel,
          data: currArr,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.22)',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#3b82f6',
          pointRadius: 3.5,
          pointHoverRadius: 5
        },
        {
          label: prevLabel,
          data: prevArr,
          borderColor: '#1e3a5f',
          backgroundColor: 'rgba(30, 58, 95, 0.35)',
          borderWidth: 1.5,
          pointBackgroundColor: '#1e3a5f',
          pointBorderColor: '#1e3a5f',
          pointRadius: 2.5,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#121215',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#26262c',
          borderWidth: 1,
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${item.raw.toLocaleString('es-ES')} ${unit}`
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.07)' },
          angleLines: { color: 'rgba(255, 255, 255, 0.07)' },
          pointLabels: {
            color: '#cbd5e1',
            font: { size: 11, weight: '600', family: 'monospace' }
          },
          ticks: { display: false }
        }
      }
    }
  });

  radarRepsChartInstance = new Chart(repsCanvas.getContext('2d'), buildRadarConfig(currData.reps, prevData.reps, 'reps'));
  radarVolumeChartInstance = new Chart(volCanvas.getContext('2d'), buildRadarConfig(currData.vol, prevData.vol, isBal ? 'kg eq.' : 'kg'));
}

/**
 * Activity Calendar (GitHub-style Heatmap)
 */
function renderActivityCalendar() {
  const container = document.getElementById('activityCalendarGrid');
  const legendEl = document.getElementById('calendarLegend');
  const rangeEl = document.getElementById('calendarRangeLabel');
  if (!container || !legendEl) return;

  if (!allSessions.length) {
    container.innerHTML = '<div class="text-xs text-slate-500 py-6 text-center">No hay sesiones registradas para mostrar el calendario.</div>';
    legendEl.innerHTML = '';
    if (rangeEl) rangeEl.textContent = '-';
    return;
  }

  const dayMap = {};
  allSessions.forEach((s, idx) => {
    if (!s.date_day) return;
    if (!dayMap[s.date_day]) {
      dayMap[s.date_day] = { sessions: [], totalVol: 0, totalSets: 0 };
    }
    dayMap[s.date_day].sessions.push({ session: s, globalIdx: idx });
    dayMap[s.date_day].totalVol += s.total_volume || 0;
    dayMap[s.date_day].totalSets += s.total_sets || 0;
  });

  const rangeMode = document.getElementById('calendarRangeSelect')?.value || '1y';
  const maxDayStr = allSessions[allSessions.length - 1].date_day;
  const minDayStr = allSessions[0].date_day;
  const minDt = parseLocalDay(minDayStr);
  const maxDt = parseLocalDay(maxDayStr);

  let rangeEndDt = new Date(maxDt);
  let rangeStartDt = new Date(maxDt);

  if (rangeMode === '1m') {
    rangeStartDt.setMonth(rangeStartDt.getMonth() - 1);
    if (rangeStartDt < minDt) rangeStartDt = new Date(minDt);
  } else if (rangeMode === '3m') {
    rangeStartDt.setMonth(rangeStartDt.getMonth() - 3);
    if (rangeStartDt < minDt) rangeStartDt = new Date(minDt);
  } else if (rangeMode === '6m') {
    rangeStartDt.setMonth(rangeStartDt.getMonth() - 6);
    if (rangeStartDt < minDt) rangeStartDt = new Date(minDt);
  } else if (rangeMode === '1y') {
    rangeStartDt.setDate(rangeStartDt.getDate() - 364);
    if (rangeStartDt < minDt) rangeStartDt = new Date(minDt);
  } else if (rangeMode === 'ytd') {
    rangeStartDt = new Date(rangeEndDt.getFullYear(), 0, 1, 12, 0, 0);
    if (rangeStartDt < minDt) rangeStartDt = new Date(minDt);
  } else if (rangeMode === 'all') {
    rangeStartDt = new Date(minDt);
  } else if (rangeMode === 'filter') {
    const fStart = document.getElementById('dateStart')?.value;
    const fEnd = document.getElementById('dateEnd')?.value;
    rangeStartDt = fStart ? parseLocalDay(fStart) : new Date(minDt);
    rangeEndDt = fEnd ? parseLocalDay(fEnd) : new Date(maxDt);
  } else if (rangeMode === 'custom') {
    const cStart = document.getElementById('calDateStart')?.value;
    const cEnd = document.getElementById('calDateEnd')?.value;
    rangeStartDt = cStart ? parseLocalDay(cStart) : new Date(minDt);
    rangeEndDt = cEnd ? parseLocalDay(cEnd) : new Date(maxDt);
  }

  if (rangeStartDt > rangeEndDt) {
    const tmp = rangeStartDt;
    rangeStartDt = rangeEndDt;
    rangeEndDt = tmp;
  }

  const strictStartClamp = (rangeMode === 'filter' || rangeMode === 'custom');
  const startDt = new Date(rangeStartDt);
  // Align startDt to Monday
  const startDow = (startDt.getDay() + 6) % 7; // 0=Mon..6=Sun
  startDt.setDate(startDt.getDate() - startDow);

  const fmtShort = (d) => `${d.getDate()} ${SPANISH_MONTH_NAMES[d.getMonth()].toUpperCase()} '${String(d.getFullYear()).slice(2)}`;
  const rangeStartStr = fmtLocalDay(rangeStartDt);
  const rangeEndStr = fmtLocalDay(rangeEndDt);
  const alignedStartStr = fmtLocalDay(startDt);

  // Count visible sessions & compute max volume for intensity scaling
  let visibleSessionCount = 0;
  const visibleVolumes = [];
  Object.entries(dayMap).forEach(([ds, info]) => {
    const minVisible = strictStartClamp ? rangeStartStr : alignedStartStr;
    if (ds >= minVisible && ds <= rangeEndStr) {
      visibleSessionCount += info.sessions.length;
      if (info.totalVol > 0) visibleVolumes.push(info.totalVol);
    }
  });
  if (rangeEl) {
    rangeEl.textContent = `${fmtShort(rangeStartDt)} → ${fmtShort(rangeEndDt)} · ${visibleSessionCount} ses.`;
  }

  const maxVol = visibleVolumes.length ? Math.max(...visibleVolumes) : 1;

  // Build weeks
  const weeks = [];
  let cursor = new Date(startDt);
  while (cursor <= rangeEndDt) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const INTENSITY_COLORS = ['#1c1c1e', '#0c2d4d', '#114b82', '#1668b8', '#3b82f6'];
  const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  let monthRowHtml = '<div class="flex gap-1.5 mb-1.5">';
  monthRowHtml += '<div class="w-4 pr-1 shrink-0"></div>';
  let lastMonth = -1;
  let lastLabelCol = -10;
  weeks.forEach((week, wIdx) => {
    const firstDay = week[0];
    const m = firstDay.getMonth();
    let label = '';
    if (m !== lastMonth) {
      const nextWeekChanges = (wIdx === 0 && weeks.length > 2 && weeks[1][0].getMonth() !== m);
      if (!nextWeekChanges && (wIdx - lastLabelCol >= 2)) {
        label = SPANISH_MONTH_NAMES[m].toUpperCase();
        if (wIdx === 0 || m === 0) {
          label += ` '${String(firstDay.getFullYear()).slice(2)}`;
        }
        lastLabelCol = wIdx;
      }
      lastMonth = m;
    }
    monthRowHtml += `<div class="w-3.5 shrink-0 text-[10px] font-mono text-slate-400 whitespace-nowrap overflow-visible">${label}</div>`;
  });
  monthRowHtml += '</div>';

  let gridHtml = '<div class="flex gap-1.5">';
  // Day of week labels column
  gridHtml += '<div class="flex flex-col gap-1.5 pr-1 shrink-0">';
  DAY_LABELS.forEach(dl => {
    gridHtml += `<div class="h-3.5 w-4 text-[10px] font-mono text-slate-500 flex items-center justify-end">${dl}</div>`;
  });
  gridHtml += '</div>';

  // Week columns
  weeks.forEach(week => {
    gridHtml += '<div class="flex flex-col gap-1.5 shrink-0">';
    week.forEach(d => {
      const ds = fmtLocalDay(d);
      const isOutOfRange = (d > rangeEndDt) || (strictStartClamp && d < rangeStartDt);
      const info = dayMap[ds];
      let bg = INTENSITY_COLORS[0];
      let title = `${ds}: Sin entrenamiento`;
      let cursorCls = '';
      let dataAttr = '';

      if (isOutOfRange) {
        bg = 'transparent';
        title = '';
      } else if (info && info.sessions.length > 0) {
        const mainSess = info.sessions[info.sessions.length - 1].session;
        const routine = mainSess.routine_category || 'General / Otro';
        if (calendarMode === 'split') {
          bg = (ROUTINE_COLORS[routine] && ROUTINE_COLORS[routine].bg) || '#64748b';
        } else {
          const ratio = info.totalVol / maxVol;
          const level = ratio > 0.75 ? 4 : (ratio > 0.5 ? 3 : (ratio > 0.25 ? 2 : 1));
          bg = INTENSITY_COLORS[level];
        }
        const titles = info.sessions.map(x => x.session.title).join(' + ');
        title = `${ds} • ${titles} (${routine}) • ${info.totalSets} series • ${Math.round(info.totalVol).toLocaleString('es-ES')} kg`;
        cursorCls = 'cursor-pointer hover:ring-2 hover:ring-white/70';
        dataAttr = `data-cal-date="${ds}"`;
      }

      gridHtml += `<div class="w-3.5 h-3.5 shrink-0 rounded-[3px] transition-all ${cursorCls}" style="background-color:${bg}" title="${escHtml(title)}" ${dataAttr}></div>`;
    });
    gridHtml += '</div>';
  });
  gridHtml += '</div>';

  container.innerHTML = monthRowHtml + gridHtml;

  // Click handler on active calendar cells
  container.querySelectorAll('[data-cal-date]').forEach(el => {
    el.addEventListener('click', () => {
      const ds = el.getAttribute('data-cal-date');
      const idxInFiltered = filteredSessions.findIndex(s => s.date_day === ds);
      if (idxInFiltered >= 0) {
        currentSessionIndex = idxInFiltered;
        showSessionDetail(filteredSessions[idxInFiltered], idxInFiltered);
        highlightSelectedPoint();
        document.getElementById('sessionDetailContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (dayMap[ds] && dayMap[ds].sessions.length > 0) {
        showSessionDetail(dayMap[ds].sessions[0].session, 0);
        document.getElementById('sessionDetailContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Legend
  if (calendarMode === 'split') {
    legendEl.innerHTML = '<span class="text-slate-500 mr-1">RUTINAS:</span>' +
      Object.entries(ROUTINE_COLORS).map(([name, c]) =>
        `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-dark-950 border border-dark-800 text-[10px]">
          <span class="w-2.5 h-2.5 rounded-[2px]" style="background-color:${c.bg}"></span>
          <span>${escHtml(name)}</span>
        </span>`
      ).join('');
  } else {
    legendEl.innerHTML = `
      <span>MENOS</span>
      ${INTENSITY_COLORS.map(c => `<span class="w-3 h-3 rounded-[2px] inline-block" style="background-color:${c}"></span>`).join('')}
      <span>MÁS</span>
    `;
  }
}

/* =========================================================
 * Biomechanical kg-equivalent Calibration & Recalculation
 * ========================================================= */

function loadBalanceConfig() {
  userBodyweightKg = 75;
  userBalanceOverrides = {};
  try {
    const raw = localStorage.getItem(BALANCE_CONFIG_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const bw = parseFloat(parsed.bodyweight_kg);
      if (!Number.isNaN(bw) && bw >= 30 && bw <= 250) userBodyweightKg = bw;
      if (parsed.overrides && typeof parsed.overrides === 'object') {
        userBalanceOverrides = parsed.overrides;
      }
    }
  } catch (_) {}
}

function saveBalanceConfig() {
  try {
    localStorage.setItem(BALANCE_CONFIG_STORAGE_KEY, JSON.stringify({
      bodyweight_kg: userBodyweightKg,
      overrides: userBalanceOverrides
    }));
  } catch (_) {}
}

function mergeBalanceMap() {
  exerciseBalanceMap = {};
  const allKeys = new Set([
    ...Object.keys(defaultExerciseBalanceMap || {}),
    ...Object.keys(userBalanceOverrides || {})
  ]);
  allKeys.forEach(ex => {
    const def = defaultExerciseBalanceMap[ex] || { bw_ratio: 0, bilateral: 1, mech_factor: 1, is_assisted: false, profile: 'Estándar' };
    const ov = userBalanceOverrides[ex];
    if (ov) {
      exerciseBalanceMap[ex] = {
        bw_ratio: Number(ov.bw_ratio ?? def.bw_ratio) || 0,
        bilateral: Number(ov.bilateral ?? def.bilateral) || 1,
        mech_factor: Number(ov.mech_factor ?? def.mech_factor) || 1,
        is_assisted: Boolean(ov.is_assisted ?? def.is_assisted),
        profile: 'Personalizado'
      };
    } else {
      exerciseBalanceMap[ex] = { ...def };
    }
  });
}

function calc1rmLocal(weight, reps) {
  if (window.HevyCore && typeof window.HevyCore.calc1rm === 'function') {
    return window.HevyCore.calc1rm(weight, reps);
  }
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return roundOneDecimal(weight);
  return roundOneDecimal(weight * (1 + reps / 30));
}

function calcBalancedWeightLocal(weightKg, reps, muscleGroup, bio, bwKg) {
  if (window.HevyCore && typeof window.HevyCore.calcBalancedWeight === 'function') {
    return window.HevyCore.calcBalancedWeight(weightKg, reps, muscleGroup, bio, bwKg);
  }
  if (reps <= 0 || muscleGroup === 'Cardio / Otro') return 0;
  const bwRatio = Number(bio && bio.bw_ratio) || 0;
  const bilateral = Number(bio && bio.bilateral) || 1;
  const mech = Number(bio && bio.mech_factor) || 1;
  const isAssisted = Boolean(bio && bio.is_assisted);
  let base = 0;
  if (isAssisted) {
    base = Math.max(0, (bwRatio * bwKg) - weightKg);
  } else if (bwRatio === 0 && weightKg <= 0) {
    return 0;
  } else {
    base = weightKg + (bwRatio * bwKg);
  }
  return roundOneDecimal(base * bilateral * mech);
}

function recalculateBalancedMetrics() {
  allSessions.forEach(sess => {
    let balTotal = 0;
    let balMaxWeight = 0;
    const balExVol = {};
    const balMVol = {};
    const balMVolFrac = {};
    const balExOrm = {};
    const balMOrm = {};
    const balExWeight = {};
    const balMWeight = {};

    (sess.sets || []).forEach(s => {
      const ex = s.exercise_title;
      const m = s.muscle_group || 'Otro';
      const bio = exerciseBalanceMap[ex] || defaultExerciseBalanceMap[ex] || { bw_ratio: 0, bilateral: 1, mech_factor: 1, is_assisted: false };
      const eqWeight = calcBalancedWeightLocal(s.weight_kg || 0, s.reps || 0, m, bio, userBodyweightKg);
      let balVol = 0;
      let balOrm = 0;
      if (eqWeight > 0 && s.reps > 0) {
        balVol = roundOneDecimal(eqWeight * s.reps);
        balOrm = calc1rmLocal(eqWeight, s.reps);
      }
      s.balanced_weight = eqWeight;
      s.balanced_volume = balVol;
      s.balanced_1rm = balOrm;

      balTotal += balVol;
      if (eqWeight > balMaxWeight) balMaxWeight = eqWeight;
      balExVol[ex] = roundOneDecimal((balExVol[ex] || 0) + balVol);
      balMVol[m] = roundOneDecimal((balMVol[m] || 0) + balVol);
      balMVolFrac[m] = roundOneDecimal((balMVolFrac[m] || 0) + balVol);
      (s.secondary_muscles || []).forEach(([ms, wt]) => {
        balMVolFrac[ms] = roundOneDecimal((balMVolFrac[ms] || 0) + balVol * wt);
      });
      if (balOrm > (balExOrm[ex] || 0)) balExOrm[ex] = balOrm;
      if (balOrm > (balMOrm[m] || 0)) balMOrm[m] = balOrm;
      if (eqWeight > (balExWeight[ex] || 0)) balExWeight[ex] = eqWeight;
      if (eqWeight > (balMWeight[m] || 0)) balMWeight[m] = eqWeight;
    });

    sess.balanced_total_volume = roundOneDecimal(balTotal);
    sess.balanced_max_weight = roundOneDecimal(balMaxWeight);
    sess.balanced_exercise_volumes = balExVol;
    sess.balanced_muscle_volumes = balMVol;
    sess.balanced_muscle_volumes_fractional = balMVolFrac;
    sess.balanced_exercise_max_orm = balExOrm;
    sess.balanced_muscle_max_orm = balMOrm;
    sess.balanced_exercise_max_weight = balExWeight;
    sess.balanced_muscle_max_weight = balMWeight;
    sess.balanced_sum_orm = roundOneDecimal(Object.values(balExOrm).reduce((a, b) => a + b, 0));
  });
}

function getLatestExerciseSample() {
  const sample = {};
  for (let i = allSessions.length - 1; i >= 0; i--) {
    const sets = allSessions[i].sets || [];
    for (let j = sets.length - 1; j >= 0; j--) {
      const st = sets[j];
      if (!sample[st.exercise_title] && st.reps > 0) {
        sample[st.exercise_title] = { weight_kg: st.weight_kg || 0, reps: st.reps, muscle: st.muscle_group || 'Otro' };
      }
    }
  }
  return sample;
}

function renderBalanceModal() {
  const tbody = document.getElementById('balanceModalTableBody');
  if (!tbody) return;

  const searchQ = (document.getElementById('balanceSearchInput')?.value || '').trim().toLowerCase();
  const usedOnly = Boolean(document.getElementById('balanceFilterUsedOnly')?.checked);
  const usedSet = new Set(allExercises);
  const sampleMap = getLatestExerciseSample();

  let keys = Object.keys(exerciseBalanceMap);
  if (usedOnly && usedSet.size > 0) {
    keys = keys.filter(k => usedSet.has(k));
  }
  if (searchQ) {
    keys = keys.filter(k => {
      const prof = (exerciseBalanceMap[k]?.profile || '').toLowerCase();
      return k.toLowerCase().includes(searchQ) || prof.includes(searchQ);
    });
  }

  keys.sort((a, b) => {
    const aUsed = usedSet.has(a) ? 0 : 1;
    const bUsed = usedSet.has(b) ? 0 : 1;
    if (aUsed !== bUsed) return aUsed - bUsed;
    return a.localeCompare(b);
  });

  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-500">No hay ejercicios que coincidan con el filtro.</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  keys.forEach(ex => {
    const bio = exerciseBalanceMap[ex];
    const isCustom = Boolean(userBalanceOverrides[ex]);
    const samp = sampleMap[ex] || { weight_kg: 50, reps: 10, muscle: exerciseMuscleMap[ex] || 'Otro' };
    const eqW = calcBalancedWeightLocal(samp.weight_kg, samp.reps, samp.muscle, bio, userBodyweightKg);
    const muscle = exerciseMuscleMap[ex] || 'Otro';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-dark-800/40 transition-colors';

    const tdName = document.createElement('td');
    tdName.className = 'py-2.5 px-4';
    tdName.innerHTML = `
      <div class="font-semibold text-white">${escHtml(ex)}</div>
      <div class="text-[10px] text-slate-500">${escHtml(muscle)}</div>
    `;

    const tdProf = document.createElement('td');
    tdProf.className = 'py-2.5 px-3';
    tdProf.innerHTML = `<span class="px-2 py-0.5 rounded-md text-[10px] font-medium ${isCustom ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-dark-800 text-slate-300'}">${bio.profile || 'Estándar'}</span>`;

    const makeNumInput = (field, val, step, min, max) => {
      const td = document.createElement('td');
      td.className = 'py-2 px-3 text-center';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.step = String(step);
      inp.min = String(min);
      inp.max = String(max);
      inp.value = val;
      inp.className = 'w-16 bg-dark-950 border border-dark-700 rounded px-2 py-1 text-center text-white font-mono focus:outline-none focus:border-cyan-500';
      inp.addEventListener('change', () => {
        const parsed = parseFloat(inp.value);
        const def = defaultExerciseBalanceMap[ex] || bio;
        const cur = userBalanceOverrides[ex] || { ...def };
        cur[field] = Number.isNaN(parsed) ? def[field] : parsed;
        userBalanceOverrides[ex] = cur;
        saveBalanceConfig();
        mergeBalanceMap();
        recalculateBalancedMetrics();
        updateExample();
        tdProf.innerHTML = `<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Personalizado</span>`;
        updateUI();
        if (currentSessionIndex >= 0 && filteredSessions[currentSessionIndex]) {
          showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
        }
      });
      td.appendChild(inp);
      return td;
    };

    const tdAssisted = document.createElement('td');
    tdAssisted.className = 'py-2 px-3 text-center';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = Boolean(bio.is_assisted);
    chk.className = 'rounded border-dark-700 bg-dark-950 text-cyan-500 focus:ring-0 cursor-pointer';
    chk.addEventListener('change', () => {
      const def = defaultExerciseBalanceMap[ex] || bio;
      const cur = userBalanceOverrides[ex] || { ...def };
      cur.is_assisted = chk.checked;
      userBalanceOverrides[ex] = cur;
      saveBalanceConfig();
      mergeBalanceMap();
      recalculateBalancedMetrics();
      updateExample();
      tdProf.innerHTML = `<span class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Personalizado</span>`;
      updateUI();
      if (currentSessionIndex >= 0 && filteredSessions[currentSessionIndex]) {
        showSessionDetail(filteredSessions[currentSessionIndex], currentSessionIndex);
      }
    });
    tdAssisted.appendChild(chk);

    const tdExample = document.createElement('td');
    tdExample.className = 'py-2.5 px-4 text-right font-mono whitespace-nowrap';
    const updateExample = () => {
      const updatedBio = exerciseBalanceMap[ex] || bio;
      const updatedEq = calcBalancedWeightLocal(samp.weight_kg, samp.reps, samp.muscle, updatedBio, userBodyweightKg);
      tdExample.innerHTML = `<span class="text-slate-400">${samp.weight_kg} kg</span> <span class="text-slate-600">&rarr;</span> <strong class="text-cyan-300">${updatedEq} kg eq.</strong>`;
    };
    tdExample.innerHTML = `<span class="text-slate-400">${samp.weight_kg} kg</span> <span class="text-slate-600">&rarr;</span> <strong class="text-cyan-300">${eqW} kg eq.</strong>`;

    tr.appendChild(tdName);
    tr.appendChild(tdProf);
    tr.appendChild(makeNumInput('bw_ratio', bio.bw_ratio, 0.05, 0, 2));
    tr.appendChild(makeNumInput('bilateral', bio.bilateral, 1, 1, 2));
    tr.appendChild(makeNumInput('mech_factor', bio.mech_factor, 0.05, 0.1, 3));
    tr.appendChild(tdAssisted);
    tr.appendChild(tdExample);
    tbody.appendChild(tr);
  });
}
