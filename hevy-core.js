/**
 * Hevy Analytics core: parses a Hevy CSV export entirely in the browser.
 * Nothing is uploaded anywhere. Exposes window.HevyCore.parseCsv(text).
 */
(function () {
  const EXERCISE_MUSCLE_MAP = {
    "Bench Press (Barbell)": "Pecho",
    "Bench Press - Close Grip (Barbell)": "Pecho",
    "Butterfly (Pec Deck)": "Pecho",
    "Cable Fly Crossovers": "Pecho",
    "Chest Fly (Dumbbell)": "Pecho",
    "Chest Press (Machine)": "Pecho",
    "Incline Bench Press (Barbell)": "Pecho",
    "Incline Bench Press (Dumbbell)": "Pecho",
    "Low Cable Fly Crossovers": "Pecho",
    "Chest Supported Incline Row (Dumbbell)": "Espalda",
    "Chin Up": "Espalda",
    "Chin Up (Weighted)": "Espalda",
    "Deadlift (Barbell)": "Espalda",
    "Iso-Lateral Row (Machine)": "Espalda",
    "Lat Pulldown (Cable)": "Espalda",
    "Lat Pulldown (Machine)": "Espalda",
    "Pendlay Row (Barbell)": "Espalda",
    "Pull Up": "Espalda",
    "Rack Pull": "Espalda",
    "Rope Straight Arm Pulldown": "Espalda",
    "Seated Cable Row - Bar Grip": "Espalda",
    "Seated Cable Row - Bar Wide Grip": "Espalda",
    "Single Arm Cable Row": "Espalda",
    "Straight Arm Lat Pulldown (Cable)": "Espalda",
    "Face Pull": "Hombro",
    "Lateral Raise (Cable)": "Hombro",
    "Lateral Raise (Dumbbell)": "Hombro",
    "Overhead Press (Smith Machine)": "Hombro",
    "Rear Delt Reverse Fly (Machine)": "Hombro",
    "Reverse Fly Single Arm (Cable)": "Hombro",
    "Seated Shoulder Press (Machine)": "Hombro",
    "Shoulder Press (Dumbbell)": "Hombro",
    "Calf Extension (Machine)": "Pierna",
    "Hack Squat (Machine)": "Pierna",
    "Hip Adduction (Machine)": "Pierna",
    "Hip Thrust (Barbell)": "Pierna",
    "Hip Thrust (Machine)": "Pierna",
    "Leg Extension (Machine)": "Pierna",
    "Leg Press (Machine)": "Pierna",
    "Leg Press Horizontal (Machine)": "Pierna",
    "Lying Leg Curl (Machine)": "Pierna",
    "Seated Calf Raise": "Pierna",
    "Seated Leg Curl (Machine)": "Pierna",
    "Squat (Barbell)": "Pierna",
    "Squat (Smith Machine)": "Pierna",
    "Standing Calf Raise (Smith)": "Pierna",
    "Bayesian": "Bíceps",
    "Behind the Back Wrist Curl (Barbell)": "Bíceps",
    "Bicep Curl (Barbell)": "Bíceps",
    "Bicep Curl (Cable)": "Bíceps",
    "Bicep Curl (Dumbbell)": "Bíceps",
    "Curl Martillo Cable Unilateral": "Bíceps",
    "Hammer Curl (Cable)": "Bíceps",
    "Hammer Curl (Dumbbell)": "Bíceps",
    "Preacher Curl (Barbell)": "Bíceps",
    "Preacher Curl (Dumbbell)": "Bíceps",
    "Preacher Curl (Machine)": "Bíceps",
    "Reverse Curl (Barbell)": "Bíceps",
    "Seated Incline Curl (Dumbbell)": "Bíceps",
    "Overhead Triceps Extension (Cable)": "Tríceps",
    "Single Arm Triceps Pushdown (Cable)": "Tríceps",
    "Skullcrusher (Barbell)": "Tríceps",
    "Triceps Extension (Cable)": "Tríceps",
    "Triceps Extension (Machine)": "Tríceps",
    "Triceps Kickback (Cable)": "Tríceps",
    "Triceps Kickback (Dumbbell)": "Tríceps",
    "Triceps Pressdown": "Tríceps",
    "Triceps Pushdown": "Tríceps",
    "Triceps Rope Pushdown": "Tríceps",
    "Tríceps Bastardo": "Tríceps",
    "Tríceps Bastardo Alto Barra": "Tríceps",
    "Tríceps En Abdominales": "Tríceps",
    "Tríceps Lonamico": "Tríceps",
    "Crunch (Machine)": "Abdomen",
    "Crunch (Weighted)": "Abdomen",
    "Decline Crunch": "Abdomen",
    "Decline Crunch (Weighted)": "Abdomen",
    "Dragonfly": "Abdomen",
    "Cycling": "Cardio / Otro",
    "Elliptical Trainer": "Cardio / Otro",
    "Treadmill": "Cardio / Otro",
    "atraco a maquina Al Fallo": "Cardio / Otro"
  };

  // Secondary muscles with fractional set weight: [muscle, weight]
  const EXERCISE_SECONDARY_MUSCLES = {
    "Bench Press (Barbell)": [
      [
        "Tríceps",
        0.5
      ],
      [
        "Hombro",
        0.5
      ]
    ],
    "Bench Press - Close Grip (Barbell)": [
      [
        "Tríceps",
        0.75
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Chest Press (Machine)": [
      [
        "Tríceps",
        0.5
      ],
      [
        "Hombro",
        0.5
      ]
    ],
    "Incline Bench Press (Barbell)": [
      [
        "Hombro",
        0.5
      ],
      [
        "Tríceps",
        0.5
      ]
    ],
    "Incline Bench Press (Dumbbell)": [
      [
        "Hombro",
        0.5
      ],
      [
        "Tríceps",
        0.5
      ]
    ],
    "Chest Supported Incline Row (Dumbbell)": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Chin Up": [
      [
        "Bíceps",
        0.5
      ]
    ],
    "Chin Up (Weighted)": [
      [
        "Bíceps",
        0.5
      ]
    ],
    "Deadlift (Barbell)": [
      [
        "Pierna",
        0.5
      ]
    ],
    "Iso-Lateral Row (Machine)": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Lat Pulldown (Cable)": [
      [
        "Bíceps",
        0.5
      ]
    ],
    "Lat Pulldown (Machine)": [
      [
        "Bíceps",
        0.5
      ]
    ],
    "Pendlay Row (Barbell)": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Pull Up": [
      [
        "Bíceps",
        0.5
      ]
    ],
    "Rack Pull": [
      [
        "Pierna",
        0.5
      ]
    ],
    "Seated Cable Row - Bar Grip": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Seated Cable Row - Bar Wide Grip": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Single Arm Cable Row": [
      [
        "Bíceps",
        0.5
      ],
      [
        "Hombro",
        0.25
      ]
    ],
    "Face Pull": [
      [
        "Espalda",
        0.5
      ]
    ],
    "Overhead Press (Smith Machine)": [
      [
        "Tríceps",
        0.5
      ]
    ],
    "Seated Shoulder Press (Machine)": [
      [
        "Tríceps",
        0.5
      ]
    ],
    "Shoulder Press (Dumbbell)": [
      [
        "Tríceps",
        0.5
      ]
    ],
    "Rear Delt Reverse Fly (Machine)": [
      [
        "Espalda",
        0.25
      ]
    ],
    "Reverse Fly Single Arm (Cable)": [
      [
        "Espalda",
        0.25
      ]
    ]
  };

  const MONTHS = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12, "jan": 1, "apr": 4, "aug": 8, "dec": 12};

  const ORDERED_MUSCLE_GROUPS = ["Pierna", "Espalda", "Pecho", "Bíceps", "Hombro", "Tríceps", "Abdomen", "Cardio / Otro"];
  const ORDERED_ROUTINES = ["Push (Empuje)", "Pull (Tirón)", "Legs (Pierna)", "Torso", "Brazos", "General / Otro"];

  // Round half to even on exact ties (matches Python's round), otherwise nearest.
  const round = (x, n = 1) => {
    const f = 10 ** n, y = x * f, fl = Math.floor(y);
    const r = (y - fl === 0.5) ? (fl % 2 === 0 ? fl : fl + 1) : Math.round(y);
    return r / f;
  };
  const pad = (n) => String(n).padStart(2, '0');

  // ---- RFC 4180 CSV parser (quotes, escaped quotes, newlines inside fields) ----
  function parseCsvRows(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parseHevyDate(str) {
    if (!str) return null;
    const m = str.trim().toLowerCase().match(/(\d+)\s+([a-z]+)\.?\s+(\d{4})(?:,\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    const [, day, mon, year, hr, mn] = m;
    const key = MONTHS[mon.slice(0, 4)] ? mon.slice(0, 4) : mon.slice(0, 3);
    const month = MONTHS[key] || 1;
    const d = new Date(+year, month - 1, +day, hr ? +hr : 0, mn ? +mn : 0);
    return isNaN(d) ? null : d;
  }

  function calc1rm(weight, reps) {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return round(weight, 1);
    return round(weight * (1 + reps / 30), 1);
  }

  function detectRoutineCategory(title, sets) {
    const t = title.toLowerCase();
    const has = (ks) => ks.some((k) => t.includes(k));
    if (has(['push', 'empuje'])) return 'Push (Empuje)';
    if (has(['pull', 'tirón', 'tiron'])) return 'Pull (Tirón)';
    if (has(['leg', 'pierna', 'pata', 'cuadri'])) return 'Legs (Pierna)';
    if (has(['torso'])) return 'Torso';
    if (has(['brazo', 'arm', 'biceps', 'triceps'])) return 'Brazos';

    const vol = (groups) => sets
      .filter((s) => groups.includes(EXERCISE_MUSCLE_MAP[s.exercise_title]))
      .reduce((a, s) => a + s.volume_kg, 0);
    const push = vol(['Pecho', 'Hombro', 'Tríceps']);
    const pull = vol(['Espalda', 'Bíceps']);
    const legs = vol(['Pierna']);
    const total = push + pull + legs;
    if (total === 0) return 'General / Otro';
    if (legs / total > 0.45) return 'Legs (Pierna)';
    if (push / total > 0.55) return 'Push (Empuje)';
    if (pull / total > 0.55) return 'Pull (Tirón)';
    if (push / total > 0.3 && pull / total > 0.3) return 'Torso';
    return 'General / Otro';
  }

  const add = (obj, key, val, n = 1) => { obj[key] = round((obj[key] || 0) + val, n); };

  function parseCsv(text) {
    const table = parseCsvRows(text);
    if (!table.length) throw new Error('El archivo está vacío');
    const header = table[0].map((h) => h.trim());
    if (!header.includes('start_time') || !header.includes('exercise_title')) {
      throw new Error('No parece un export de Hevy: faltan las columnas start_time / exercise_title');
    }
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const get = (r, k) => (idx[k] === undefined ? '' : (r[idx[k]] || '').trim());

    const workouts = new Map();
    let totalRows = 0;

    for (let r = 1; r < table.length; r++) {
      const row = table[r];
      totalRows++;
      const startStr = get(row, 'start_time');
      const title = get(row, 'title') || 'Entrenamiento';
      if (!startStr) continue;

      const key = startStr + '\u0000' + title;
      if (!workouts.has(key)) {
        const dt = parseHevyDate(startStr);
        const endStr = get(row, 'end_time');
        const endDt = parseHevyDate(endStr);
        let duration = 0;
        if (dt && endDt && endDt >= dt) duration = Math.floor((endDt - dt) / 60000);
        workouts.set(key, {
          id: 'sess_' + workouts.size,
          title,
          start_time_str: startStr,
          end_time_str: endStr,
          date_iso: dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}` : startStr,
          date_day: dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '',
          timestamp: dt ? dt.getTime() / 1000 : 0,
          duration_min: duration,
          description: get(row, 'description'),
          sets: [],
        });
      }
      const sess = workouts.get(key);

      const w = parseFloat(get(row, 'weight_kg')) || 0;
      const reps = Math.trunc(parseFloat(get(row, 'reps')) || 0);
      const ex = get(row, 'exercise_title') || 'Sin ejercicio';

      sess.sets.push({
        set_index: Number.isNaN(parseInt(get(row, 'set_index'), 10)) ? sess.sets.length : parseInt(get(row, 'set_index'), 10),
        exercise_title: ex,
        muscle_group: EXERCISE_MUSCLE_MAP[ex] || 'Otro',
        secondary_muscles: EXERCISE_SECONDARY_MUSCLES[ex] || [],
        set_type: (get(row, 'set_type') || 'normal').toLowerCase(),
        weight_kg: w,
        reps,
        volume_kg: round(w * reps, 1),
        estimated_1rm: calc1rm(w, reps),
        rpe: get(row, 'rpe'),
        exercise_notes: get(row, 'exercise_notes'),
        is_pr: false,
      });
    }

    const sessions = [...workouts.values()].sort((a, b) => a.timestamp - b.timestamp);
    const historyMax = {};
    const allExercises = new Set();

    for (const sess of sessions) {
      let totalVol = 0;
      const exVol = {}, exMaxOrm = {}, mVol = {}, mMaxOrm = {}, mSetsDirect = {}, mSetsFrac = {};
      const prs = [];
      const grouped = {};

      for (const s of sess.sets) {
        const ex = s.exercise_title, m = s.muscle_group;
        allExercises.add(ex);
        totalVol += s.volume_kg;
        add(exVol, ex, s.volume_kg);
        add(mVol, m, s.volume_kg);
        mSetsDirect[m] = (mSetsDirect[m] || 0) + 1;
        add(mSetsFrac, m, 1.0, 2);
        for (const [ms, wt] of s.secondary_muscles) add(mSetsFrac, ms, wt, 2);
        if (s.estimated_1rm > (exMaxOrm[ex] || 0)) exMaxOrm[ex] = s.estimated_1rm;
        if (s.estimated_1rm > (mMaxOrm[m] || 0)) mMaxOrm[m] = s.estimated_1rm;
        (grouped[ex] = grouped[ex] || []).push(s);
      }

      for (const [ex, maxOrm] of Object.entries(exMaxOrm)) {
        if (maxOrm > 0) {
          const prev = historyMax[ex] || 0;
          if (maxOrm > prev) {
            prs.push({ exercise: ex, muscle_group: EXERCISE_MUSCLE_MAP[ex] || 'Otro', new_orm: maxOrm, prev_best: prev });
            historyMax[ex] = maxOrm;
            for (const s of sess.sets) {
              if (s.exercise_title === ex && s.estimated_1rm === maxOrm) s.is_pr = true;
            }
          }
        }
      }

      Object.assign(sess, {
        total_volume: round(totalVol, 1),
        exercise_volumes: exVol,
        exercise_max_orm: exMaxOrm,
        muscle_volumes: mVol,
        muscle_max_orm: mMaxOrm,
        muscle_sets_direct: mSetsDirect,
        muscle_sets_fractional: mSetsFrac,
        routine_category: detectRoutineCategory(sess.title, sess.sets),
        sum_orm: round(Object.values(exMaxOrm).reduce((a, b) => a + b, 0), 1),
        prs_achieved: prs,
        pr_count: prs.length,
        total_sets: sess.sets.length,
        total_reps: sess.sets.reduce((a, s) => a + s.reps, 0),
        grouped_exercises: grouped,
      });
    }

    // Second pass: balanced metrics relative to all-time 1RM per exercise
    for (const sess of sessions) {
      let balTotal = 0;
      const balExVol = {}, balMVol = {}, balMVolFrac = {}, mVolFrac = {}, balExOrm = {}, balMOrm = {};

      for (const s of sess.sets) {
        const ex = s.exercise_title, m = s.muscle_group;
        const peak = historyMax[ex] || 0;
        let balVol = 0, balOrm = 0;
        if (peak > 0 && s.weight_kg > 0 && s.reps > 0) {
          balVol = round((s.weight_kg / peak) * s.reps * 100, 1);
          balOrm = round((s.estimated_1rm / peak) * 100, 1);
        }
        s.balanced_volume = balVol;
        s.balanced_1rm = balOrm;

        balTotal += balVol;
        add(balExVol, ex, balVol);
        add(balMVol, m, balVol);
        add(mVolFrac, m, s.volume_kg);
        add(balMVolFrac, m, balVol);
        for (const [ms, wt] of s.secondary_muscles) {
          add(mVolFrac, ms, s.volume_kg * wt);
          add(balMVolFrac, ms, balVol * wt);
        }
        if (balOrm > (balExOrm[ex] || 0)) balExOrm[ex] = balOrm;
        if (balOrm > (balMOrm[m] || 0)) balMOrm[m] = balOrm;
      }

      Object.assign(sess, {
        balanced_total_volume: round(balTotal, 1),
        balanced_exercise_volumes: balExVol,
        balanced_muscle_volumes: balMVol,
        muscle_volumes_fractional: mVolFrac,
        balanced_muscle_volumes_fractional: balMVolFrac,
        balanced_exercise_max_orm: balExOrm,
        balanced_muscle_max_orm: balMOrm,
        balanced_sum_orm: round(Object.values(balExOrm).reduce((a, b) => a + b, 0), 1),
      });
    }

    return {
      sessions,
      exercises: [...allExercises].sort(),
      exercise_muscle_map: EXERCISE_MUSCLE_MAP,
      exercise_secondary_map: EXERCISE_SECONDARY_MUSCLES,
      muscle_groups: ORDERED_MUSCLE_GROUPS,
      routine_categories: ORDERED_ROUTINES,
      min_date: sessions.length ? sessions[0].date_day : '',
      max_date: sessions.length ? sessions[sessions.length - 1].date_day : '',
      total_rows: totalRows,
    };
  }

  window.HevyCore = { parseCsv, EXERCISE_MUSCLE_MAP, EXERCISE_SECONDARY_MUSCLES, ORDERED_MUSCLE_GROUPS, ORDERED_ROUTINES };
})();
