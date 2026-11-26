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

let filteredSessions = [];
let previousPeriodSessions = [];
let activeMetric = 'volume'; // 'volume' | 'pr_count' | 'sum_orm'
let currentFilterType = 'all'; // 'all' | 'muscle' | 'routine' | 'exercise'
let currentFilterValue = 'ALL';
let chartType = 'line';

let chartInstance = null;
let donutChartInstance = null;
let barChartInstance = null;
let currentSessionIndex = -1;
let currentBreakdownView = 'muscle'; // 'muscle' | 'routine'
let useFractionalSets = true; // Toggle for fractional series counting
let statsMode = 'raw'; // 'raw' (kg brutos) | 'balanced' (normalizada pts)

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
  "Torso": { bg: "#f59e0b", border: "#fbbf24", text: "text-amber-400", light: "rgba(245, 158, 11, 0.15)" },
  "Brazos": { bg: "#8b5cf6", border: "#a78bfa", text: "text-purple-400", light: "rgba(139, 92, 246, 0.15)" },
  "General / Otro": { bg: "#64748b", border: "#94a3b8", text: "text-slate-400", light: "rgba(100, 116, 139, 0.15)" }
};

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchData();
});

function setupEventListeners() {
  // Metric buttons
  document.querySelectorAll('#metricTabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#metricTabs button').forEach(b => {
        b.classList.remove('active', 'bg-brand-600', 'text-white', 'shadow-md');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('active', 'bg-brand-600', 'text-white', 'shadow-md');
      btn.classList.remove('text-slate-400');

      activeMetric = btn.dataset.metric;
      updateUI();
    });
  });

  // Filter Type buttons (Todo | Músculo | Rutina | Ejercicio)
  document.querySelectorAll('#filterTypeButtons button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filterTypeButtons button').forEach(b => {
        b.classList.remove('active', 'bg-brand-600', 'text-white');
        b.classList.add('bg-dark-950', 'text-slate-400');
      });
      btn.classList.add('active', 'bg-brand-600', 'text-white');
      btn.classList.remove('bg-dark-950', 'text-slate-400');

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
      document.querySelectorAll('.range-preset').forEach(b => {
        b.classList.remove('active', 'bg-brand-600/30', 'border', 'border-brand-500/40', 'text-brand-300', 'font-semibold');
        b.classList.add('bg-dark-800', 'text-slate-300', 'font-medium');
      });
      btn.classList.add('active', 'bg-brand-600/30', 'border', 'border-brand-500/40', 'text-brand-300', 'font-semibold');
      btn.classList.remove('bg-dark-800', 'text-slate-300');

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

    const activeCls = "active px-3 py-1 rounded-lg bg-brand-600 text-white font-bold transition-all shadow-sm";
    const inactiveCls = "px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-colors";
    const activeTopCls = "active px-2.5 py-1 rounded-lg bg-brand-600 text-white font-bold transition-all shadow-sm";
    const inactiveTopCls = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-colors";

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
    btnRaw.className = "active px-3 py-1 rounded-lg bg-brand-600 text-white font-bold transition-all shadow-sm";
    btnBalanced.className = "px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-colors";
    modeHint.innerHTML = 'Mostrando kilogramos reales brutos (<code class="text-slate-300">peso × reps</code>).';
    updateUI();
  });

  btnBalanced.addEventListener('click', () => {
    statsMode = 'balanced';
    btnBalanced.className = "active px-3 py-1 rounded-lg bg-cyan-600 text-white font-bold transition-all shadow-sm";
    btnRaw.className = "px-3 py-1 rounded-lg text-slate-400 hover:text-white font-medium transition-colors";
    modeHint.innerHTML = 'Esfuerzo normalizado según tu 1RM en cada ejercicio (<code class="text-cyan-300">(peso / 1RM máx) × reps × 100 pts</code>): Prensa, Sentadilla y Banca pesan igual.';
    updateUI();
  });

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
    <span>${message}</span>
  `;
  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
  }, 4500);
}

async function fetchData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    if (!data.success) {
      showToast(data.message || 'Error cargando datos', true);
      return;
    }

    allSessions = data.sessions || [];
    allExercises = data.exercises || [];
    muscleGroups = data.muscle_groups || [];
    routineCategories = data.routine_categories || [];
    exerciseMuscleMap = data.exercise_muscle_map || {};
    exerciseSecondaryMap = data.exercise_secondary_map || {};

    // Source status
    document.getElementById('sourceStatus').innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
      ${data.source_info} &bull; ${allSessions.length} sesiones
    `;

    // Populate dropdown
    rebuildFilterDropdown();

    // Default range: last week
    applyPresetRange('1w');

    // Auto-select latest session
    if (filteredSessions.length > 0) {
      const lastIdx = filteredSessions.length - 1;
      showSessionDetail(filteredSessions[lastIdx], lastIdx);
    }
  } catch (err) {
    console.error(err);
    showToast('Fallo de conexión con el servidor local', true);
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const content = evt.target.result;
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: content
      });
      const data = await res.json();
      if (data.success) {
        showToast('CSV subido y procesado correctamente');
        await fetchData();
      } else {
        showToast(data.message || 'Error al procesar el archivo CSV', true);
      }
    } catch (err) {
      showToast('Error al enviar el archivo al servidor', true);
    }
  };
  reader.readAsArrayBuffer(file);
}

function rebuildFilterDropdown() {
  const select = document.getElementById('mainFilterSelect');
  select.innerHTML = '';

  if (currentFilterType === 'all') {
    select.innerHTML = '<option value="ALL">🏋️ Toda la Sesión (Sin filtro específico)</option>';
  } else if (currentFilterType === 'muscle') {
    select.innerHTML = '<option value="ALL">🥩 Todos los Grupos Musculares</option>';
    muscleGroups.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `🥩 Grupo: ${m}`;
      select.appendChild(opt);
    });
  } else if (currentFilterType === 'routine') {
    select.innerHTML = '<option value="ALL">📋 Todas las Rutinas</option>';
    routineCategories.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = `📋 Rutina: ${r}`;
      select.appendChild(opt);
    });
  } else if (currentFilterType === 'exercise') {
    select.innerHTML = '<option value="ALL">🏋️ Todos los Ejercicios</option>';
    allExercises.forEach(ex => {
      const opt = document.createElement('option');
      opt.value = ex;
      opt.textContent = `🏋️ ${ex} (${exerciseMuscleMap[ex] || 'Otro'})`;
      select.appendChild(opt);
    });
  }
}

function setFilterDirectly(type, value) {
  currentFilterType = type;
  document.querySelectorAll('#filterTypeButtons button').forEach(b => {
    if (b.dataset.type === type) {
      b.className = "filter-type-btn active px-2 py-0.5 rounded bg-brand-600 text-white font-medium";
    } else {
      b.className = "filter-type-btn px-2 py-0.5 rounded bg-dark-950 text-slate-400 hover:text-white font-medium";
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
      b.className = "range-preset active px-2.5 py-1 text-xs rounded-lg bg-brand-600/30 border border-brand-500/40 text-brand-300 font-semibold transition-colors";
    } else {
      b.className = "range-preset px-2.5 py-1 text-xs rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 font-medium transition-colors";
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
    b.classList.remove('active', 'bg-brand-600/30', 'border', 'border-brand-500/40', 'text-brand-300', 'font-semibold');
    b.classList.add('bg-dark-800', 'text-slate-300', 'font-medium');
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

function computePeriodMetrics(sessions) {
  let totalVol = 0;
  let totalPRs = 0;
  let max1RM = 0;
  const isBal = statsMode === 'balanced';

  sessions.forEach(s => {
    if (currentFilterType === 'all' || currentFilterValue === 'ALL') {
      totalVol += (isBal ? s.balanced_total_volume : s.total_volume) || 0;
      totalPRs += s.pr_count || 0;
      const ormVal = (isBal ? s.balanced_sum_orm : s.sum_orm) || 0;
      if (ormVal > max1RM) max1RM = ormVal;
    } else if (currentFilterType === 'muscle') {
      const volMap = isBal
        ? (useFractionalSets ? s.balanced_muscle_volumes_fractional : s.balanced_muscle_volumes)
        : (useFractionalSets ? s.muscle_volumes_fractional : s.muscle_volumes);
      const ormMap = isBal ? s.balanced_muscle_max_orm : s.muscle_max_orm;
      totalVol += (volMap && volMap[currentFilterValue]) || 0;
      const mPrs = s.prs_achieved && s.prs_achieved.filter(p => p.muscle_group === currentFilterValue).length;
      totalPRs += (mPrs || 0);
      const mORM = (ormMap && ormMap[currentFilterValue]) || 0;
      if (mORM > max1RM) max1RM = mORM;
    } else if (currentFilterType === 'routine') {
      totalVol += (isBal ? s.balanced_total_volume : s.total_volume) || 0;
      totalPRs += s.pr_count || 0;
      const ormVal = (isBal ? s.balanced_sum_orm : s.sum_orm) || 0;
      if (ormVal > max1RM) max1RM = ormVal;
    } else if (currentFilterType === 'exercise') {
      const volMap = isBal ? s.balanced_exercise_volumes : s.exercise_volumes;
      const ormMap = isBal ? s.balanced_exercise_max_orm : s.exercise_max_orm;
      totalVol += (volMap && volMap[currentFilterValue]) || 0;
      const hasPR = s.prs_achieved && s.prs_achieved.some(p => p.exercise === currentFilterValue);
      if (hasPR) totalPRs++;
      const exORM = (ormMap && ormMap[currentFilterValue]) || 0;
      if (exORM > max1RM) max1RM = exORM;
    }
  });

  return { totalCount: sessions.length, totalVol, totalPRs, max1RM };
}

function updateKPIs() {
  const isBal = statsMode === 'balanced';
  const volUnit = isBal ? ' pts' : ' kg';
  const ormUnit = (isBal && (currentFilterType === 'exercise' || currentFilterType === 'muscle')) ? '%' : (isBal ? ' pts' : ' kg');

  const curr = computePeriodMetrics(filteredSessions);
  const prev = computePeriodMetrics(previousPeriodSessions);

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
  document.getElementById('kpiTopRMSub').textContent = isBal ? 'Índice de fuerza relativa' : 'Mejor 1RM en el filtro';

  document.getElementById('kpiSessionsDiff').innerHTML = renderDiffBadge(curr.totalCount, prev.totalCount, true);
  document.getElementById('kpiVolumeDiff').innerHTML = renderDiffBadge(curr.totalVol, prev.totalVol, false, volUnit);
  document.getElementById('kpiPRsDiff').innerHTML = renderDiffBadge(curr.totalPRs, prev.totalPRs, true);
  document.getElementById('kpiTopRMDiff').innerHTML = renderDiffBadge(curr.max1RM, prev.max1RM, false, ormUnit);
}

function updateChartTitles() {
  const titleEl = document.getElementById('chartTitle');
  const isBal = statsMode === 'balanced';
  const unit = isBal ? 'pts' : 'kg';
  const fracBadge = (currentFilterType === 'muscle' && currentFilterValue !== 'ALL')
    ? (useFractionalSets ? ' (Fraccionario 0.5x)' : ' (Directo 1.0x)')
    : '';
  let filterLabel = 'por Sesión';
  if (currentFilterType === 'muscle' && currentFilterValue !== 'ALL') filterLabel = `en ${currentFilterValue}${fracBadge}`;
  else if (currentFilterType === 'routine' && currentFilterValue !== 'ALL') filterLabel = `en ${currentFilterValue}`;
  else if (currentFilterType === 'exercise' && currentFilterValue !== 'ALL') filterLabel = `en ${currentFilterValue}`;

  if (activeMetric === 'volume') {
    titleEl.innerHTML = `<i class="fa-solid fa-dumbbell text-brand-400 mr-1.5"></i> ${isBal ? 'Esfuerzo Equilibrado' : 'Volumen Total'} ${filterLabel} (${unit})`;
  } else if (activeMetric === 'sets') {
    titleEl.innerHTML = `<i class="fa-solid fa-layer-group text-cyan-400 mr-1.5"></i> Series Realizadas ${filterLabel}`;
  } else if (activeMetric === 'pr_count') {
    titleEl.innerHTML = `<i class="fa-solid fa-trophy text-amber-400 mr-1.5"></i> RMs / PRs Conseguidos ${filterLabel}`;
  } else if (activeMetric === 'sum_orm') {
    const ormLabel = isBal ? 'Índice de Fuerza (%)' : '1RM Estimado (kg)';
    titleEl.innerHTML = (currentFilterType === 'exercise' || currentFilterType === 'muscle')
      ? `<i class="fa-solid fa-bolt text-purple-400 mr-1.5"></i> Mejor ${ormLabel} ${filterLabel}`
      : `<i class="fa-solid fa-bolt text-purple-400 mr-1.5"></i> Suma de ${ormLabel} ${filterLabel}`;
  }
}

function getSessionMetricValue(s) {
  const isBal = statsMode === 'balanced';
  if (currentFilterType === 'all' || currentFilterValue === 'ALL') {
    if (activeMetric === 'volume') return isBal ? s.balanced_total_volume : s.total_volume;
    if (activeMetric === 'sets') return s.total_sets || 0;
    if (activeMetric === 'pr_count') return s.pr_count;
    if (activeMetric === 'sum_orm') return isBal ? s.balanced_sum_orm : s.sum_orm;
  } else if (currentFilterType === 'muscle') {
    if (activeMetric === 'volume') {
      const mMap = isBal
        ? (useFractionalSets ? s.balanced_muscle_volumes_fractional : s.balanced_muscle_volumes)
        : (useFractionalSets ? s.muscle_volumes_fractional : s.muscle_volumes);
      return (mMap && mMap[currentFilterValue]) || 0;
    }
    if (activeMetric === 'sets') {
      const sMap = useFractionalSets ? s.muscle_sets_fractional : s.muscle_sets_direct;
      return (sMap && sMap[currentFilterValue]) || 0;
    }
    if (activeMetric === 'pr_count') {
      return (s.prs_achieved && s.prs_achieved.filter(p => p.muscle_group === currentFilterValue).length) || 0;
    }
    if (activeMetric === 'sum_orm') {
      const oMap = isBal ? s.balanced_muscle_max_orm : s.muscle_max_orm;
      return (oMap && oMap[currentFilterValue]) || 0;
    }
  } else if (currentFilterType === 'routine') {
    if (activeMetric === 'volume') return isBal ? s.balanced_total_volume : s.total_volume;
    if (activeMetric === 'sets') return s.total_sets || 0;
    if (activeMetric === 'pr_count') return s.pr_count;
    if (activeMetric === 'sum_orm') return isBal ? s.balanced_sum_orm : s.sum_orm;
  } else if (currentFilterType === 'exercise') {
    if (activeMetric === 'volume') {
      const eMap = isBal ? s.balanced_exercise_volumes : s.exercise_volumes;
      return (eMap && eMap[currentFilterValue]) || 0;
    }
    if (activeMetric === 'sets') {
      return (s.grouped_exercises && s.grouped_exercises[currentFilterValue]) ? s.grouped_exercises[currentFilterValue].length : 0;
    }
    if (activeMetric === 'pr_count') {
      const hasPR = s.prs_achieved && s.prs_achieved.some(p => p.exercise === currentFilterValue);
      return hasPR ? 1 : 0;
    }
    if (activeMetric === 'sum_orm') {
      const oMap = isBal ? s.balanced_exercise_max_orm : s.exercise_max_orm;
      return (oMap && oMap[currentFilterValue]) || 0;
    }
  }
  return 0;
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
  const metricUnit = activeMetric === 'pr_count' ? ' RMs' : (activeMetric === 'sets' ? ' series' : (isBal ? (activeMetric === 'sum_orm' && (currentFilterType === 'exercise' || currentFilterType === 'muscle') ? '%' : ' pts') : ' kg'));
  const datasetLabel = activeMetric === 'volume' 
    ? (isBal ? 'Esfuerzo (pts)' : 'Volumen (kg)') 
    : (activeMetric === 'sets' ? 'Series' : (activeMetric === 'pr_count' ? 'RMs Conseguidos' : (isBal ? 'Fuerza Rel.' : '1RM (kg)')));

  chartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        label: datasetLabel,
        data: dataValues,
        borderColor: primaryBorder,
        backgroundColor: chartType === 'line' ? primaryBg : primaryColor,
        borderWidth: chartType === 'line' ? 2.5 : 1,
        fill: chartType === 'line',
        tension: 0.25,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#070a12',
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
          backgroundColor: '#0d1322',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#233254',
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
                lines.push(`🏆 ${s.pr_count} récord(s) batido(s)!`);
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
            color: 'rgba(35, 50, 84, 0.4)',
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
            color: 'rgba(35, 50, 84, 0.4)',
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
    return '#3b82f6';
  });
  chartInstance.update('none');
}

/**
 * Breakdown Section: Routine vs Muscle Group with Fractional Sets & Period Comparison
 */
function renderBreakdownSection() {
  const isMuscle = currentBreakdownView === 'muscle';
  const isBal = statsMode === 'balanced';
  const volUnit = isBal ? 'pts' : 'kg';
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
    const modeStr = isBal ? 'Equilibrada (pts)' : 'Bruto (kg)';
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
        borderColor: '#070a12',
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
          backgroundColor: '#0d1322',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#233254',
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
          backgroundColor: '#0d1322',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: '#233254',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (item) => ` ${volUnit === 'pts' ? 'Esfuerzo' : 'Volumen'}: ${Math.round(item.raw).toLocaleString('es-ES')} ${volUnit}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(35, 50, 84, 0.4)', tickColor: 'transparent' },
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
        <span class="truncate max-w-[150px] text-slate-300" title="${ex}">${ex}</span>
        <span class="font-semibold text-purple-300">${orm > 0 ? orm + ' kg' : '-'}</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-white flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${c.bg}"></span>
            ${st.name}
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

      <button class="mt-4 w-full py-1.5 px-3 rounded-lg bg-dark-900 hover:bg-dark-800 text-xs font-semibold text-slate-300 border border-dark-800 hover:border-dark-700 transition-colors flex items-center justify-center gap-1.5"
        onclick="setFilterDirectly('${isMuscle ? 'muscle' : 'routine'}', '${st.name}')">
        <i class="fa-solid fa-arrow-trend-up text-brand-400"></i>
        <span>Ver evolución en gráfica</span>
      </button>
    `;

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
    <i class="fa-regular fa-calendar"></i> ${s.date_iso} 
    ${s.duration_min > 0 ? `&bull; <i class="fa-regular fa-clock ml-2"></i> ${s.duration_min} minutos` : ''}
  `;

  // PR Badge
  const badge = document.getElementById('detailBadge');
  if (s.pr_count > 0) {
    badge.classList.remove('hidden');
    badge.textContent = `🏆 ${s.pr_count} Nuevo(s) Récord(s)`;
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
  document.getElementById('detailStatsRow').classList.remove('hidden');
  document.getElementById('detailVol').textContent = `${s.total_volume.toLocaleString('es-ES')} kg`;
  document.getElementById('detailDuration').textContent = s.duration_min > 0 ? `${s.duration_min} min` : 'N/D';
  document.getElementById('detailSetsReps').textContent = `${s.total_sets} series / ${s.total_reps} reps`;
  document.getElementById('detailSumORM').textContent = `${s.sum_orm.toFixed(1)} kg`;

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
    const exVol = (s.exercise_volumes && s.exercise_volumes[exName]) || 0;
    const exORM = (s.exercise_max_orm && s.exercise_max_orm[exName]) || 0;
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

      return `
        <tr class="border-b border-dark-800/50 hover:bg-dark-900/60 transition-colors text-xs">
          <td class="py-2.5 px-3 text-slate-400 font-mono font-medium">${i + 1}</td>
          <td class="py-2.5 px-3">
            <span class="${badgeClass} px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider">${typeLabel}</span>
            ${prBadgeHtml}
          </td>
          <td class="py-2.5 px-3 font-bold text-white">${st.weight_kg} <span class="text-slate-400 font-normal">kg</span></td>
          <td class="py-2.5 px-3 font-bold text-slate-200">${st.reps} <span class="text-slate-400 font-normal">reps</span></td>
          <td class="py-2.5 px-3 font-semibold text-purple-300">${st.estimated_1rm > 0 ? st.estimated_1rm + ' kg' : '-'}</td>
          <td class="py-2.5 px-3 text-emerald-400 font-medium">${st.volume_kg.toLocaleString('es-ES')} kg</td>
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
          <h4 class="font-bold text-sm text-white">${exName}</h4>
          <span class="px-2 py-0.5 text-[11px] rounded-md font-medium" style="background-color: ${mColor.light}; color: ${mColor.border}">
            ${muscle}
          </span>
          ${secBadgesHtml}
          ${prInfo ? `<span class="badge-pr text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"><i class="fa-solid fa-trophy"></i> ¡Nuevo RM: ${prInfo.new_orm} kg! (previo: ${prInfo.prev_best} kg)</span>` : ''}
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400">
          <span>Volumen: <strong class="text-emerald-400">${exVol.toLocaleString('es-ES')} kg</strong></span>
          <span>Mejor 1RM: <strong class="text-purple-400">${exORM} kg</strong></span>
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
