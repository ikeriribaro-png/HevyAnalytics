/**
 * Hevy Analytics core: parses a Hevy CSV export entirely in the browser.
 * Nothing is uploaded anywhere. Exposes window.HevyCore.parseCsv(text).
 */
(function () {
  const EXERCISE_MUSCLE_MAP = {
    // Pecho
    "Bench Press (Barbell)": "Pecho",
    "Bench Press (Dumbbell)": "Pecho",
    "Bench Press (Smith Machine)": "Pecho",
    "Bench Press (Cable)": "Pecho",
    "Bench Press - Close Grip (Barbell)": "Pecho",
    "Bench Press - Wide Grip (Barbell)": "Pecho",
    "Butterfly (Pec Deck)": "Pecho",
    "Cable Fly Crossovers": "Pecho",
    "Chest Dip": "Pecho",
    "Chest Dip (Assisted)": "Pecho",
    "Chest Dip (Weighted)": "Pecho",
    "Chest Fly (Band)": "Pecho",
    "Chest Fly (Dumbbell)": "Pecho",
    "Chest Fly (Machine)": "Pecho",
    "Chest Press (Band)": "Pecho",
    "Chest Press (Machine)": "Pecho",
    "Decline Bench Press (Barbell)": "Pecho",
    "Decline Bench Press (Dumbbell)": "Pecho",
    "Decline Bench Press (Machine)": "Pecho",
    "Decline Bench Press (Smith Machine)": "Pecho",
    "Decline Chest Fly (Dumbbell)": "Pecho",
    "Dips": "Pecho",
    "Floor Press (Barbell)": "Pecho",
    "Floor Press (Dumbbell)": "Pecho",
    "Incline Bench Press (Barbell)": "Pecho",
    "Incline Bench Press (Dumbbell)": "Pecho",
    "Incline Bench Press (Smith Machine)": "Pecho",
    "Incline Chest Fly (Dumbbell)": "Pecho",
    "Incline Chest Press (Machine)": "Pecho",
    "Incline Push Up": "Pecho",
    "Iso-Lateral Chest Press (Machine)": "Pecho",
    "Low Cable Fly Crossovers": "Pecho",
    "Pullover (Dumbbell)": "Pecho",
    "Push Up": "Pecho",
    "Push Up (Weighted)": "Pecho",
    "Seated Chest Flys (Cable)": "Pecho",
    "Single Arm Cable Crossover": "Pecho",

    // Espalda
    "Back Extension": "Espalda",
    "Back Extension (Hyperextension)": "Espalda",
    "Back Extension (Weighted Hyperextension)": "Espalda",
    "Bent Over One Arm Row (Dumbbell)": "Espalda",
    "Bent Over Row (Band)": "Espalda",
    "Bent Over Row (Barbell)": "Espalda",
    "Bent Over Row (Dumbbell)": "Espalda",
    "Chest Supported Incline Row (Dumbbell)": "Espalda",
    "Chest Supported Y Raise (Dumbbell)": "Espalda",
    "Chin Up": "Espalda",
    "Chin Up (Assisted)": "Espalda",
    "Chin Up (Weighted)": "Espalda",
    "Deadlift (Band)": "Espalda",
    "Deadlift (Barbell)": "Espalda",
    "Deadlift (Dumbbell)": "Espalda",
    "Deadlift (Smith Machine)": "Espalda",
    "Deadlift (Trap Bar)": "Espalda",
    "Dumbbell Row": "Espalda",
    "Good Morning (Barbell)": "Espalda",
    "Inverted Row": "Espalda",
    "Iso-Lateral High Row (Machine)": "Espalda",
    "Iso-Lateral Low Row": "Espalda",
    "Iso-Lateral Row (Machine)": "Espalda",
    "Kneeling Pulldown (Band)": "Espalda",
    "Lat Pulldown (Band)": "Espalda",
    "Lat Pulldown (Cable)": "Espalda",
    "Lat Pulldown (Machine)": "Espalda",
    "Lat Pulldown - Close Grip (Cable)": "Espalda",
    "Meadows Rows (Barbell)": "Espalda",
    "Pendlay Row (Barbell)": "Espalda",
    "Pull Up": "Espalda",
    "Pull Up (Assisted)": "Espalda",
    "Pull Up (Band)": "Espalda",
    "Pull Up (Weighted)": "Espalda",
    "Rack Pull": "Espalda",
    "Renegade Row (Dumbbell)": "Espalda",
    "Reverse Grip Lat Pulldown (Cable)": "Espalda",
    "Rope Straight Arm Pulldown": "Espalda",
    "Seated Cable Row - Bar Grip": "Espalda",
    "Seated Cable Row - Bar Wide Grip": "Espalda",
    "Seated Cable Row - V Grip (Cable)": "Espalda",
    "Seated Row (Machine)": "Espalda",
    "Shrug (Barbell)": "Espalda",
    "Shrug (Dumbbell)": "Espalda",
    "Shrug (Machine)": "Espalda",
    "Shrug (Smith Machine)": "Espalda",
    "Single Arm Cable Row": "Espalda",
    "Single Arm Lat Pulldown": "Espalda",
    "Straight Arm Lat Pulldown (Cable)": "Espalda",
    "Sumo Deadlift (Barbell)": "Espalda",
    "Superman": "Espalda",
    "T Bar Row": "Espalda",
    "Upright Row (Barbell)": "Espalda",

    // Hombros
    "Arnold Press (Dumbbell)": "Hombro",
    "Band Pullaparts": "Hombro",
    "Cable Shoulder Press": "Hombro",
    "Face Pull": "Hombro",
    "Front Raise (Band)": "Hombro",
    "Front Raise (Barbell)": "Hombro",
    "Front Raise (Cable)": "Hombro",
    "Front Raise (Dumbbell)": "Hombro",
    "Front Raise (Suspension)": "Hombro",
    "Handstand Push Up": "Hombro",
    "Lateral Raise (Band)": "Hombro",
    "Lateral Raise (Cable)": "Hombro",
    "Lateral Raise (Dumbbell)": "Hombro",
    "Lateral Raise (Machine)": "Hombro",
    "Military Press (Barbell)": "Hombro",
    "Overhead Press (Barbell)": "Hombro",
    "Overhead Press (Dumbbell)": "Hombro",
    "Overhead Press (Smith Machine)": "Hombro",
    "Pike Pushup": "Hombro",
    "Push Press": "Hombro",
    "Rear Delt Reverse Fly (Cable)": "Hombro",
    "Rear Delt Reverse Fly (Dumbbell)": "Hombro",
    "Rear Delt Reverse Fly (Machine)": "Hombro",
    "Reverse Fly Single Arm (Cable)": "Hombro",
    "Seated Overhead Press (Barbell)": "Hombro",
    "Seated Overhead Press (Dumbbell)": "Hombro",
    "Seated Shoulder Press (Machine)": "Hombro",
    "Shoulder Press (Dumbbell)": "Hombro",
    "Shoulder Press (Machine plates)": "Hombro",
    "Single Arm Lateral Raise (Cable)": "Hombro",
    "Upright Row (Cable)": "Hombro",
    "Upright Row (Dumbbell)": "Hombro",

    // Piernas
    "Box Jump": "Pierna",
    "Box Squat (Barbell)": "Pierna",
    "Bulgarian Split Squat": "Pierna",
    "Calf Extension (Machine)": "Pierna",
    "Calf Press (Machine)": "Pierna",
    "Donkey Calf Raise": "Pierna",
    "Front Squat (Barbell)": "Pierna",
    "Glute Bridge": "Pierna",
    "Glute Ham Raise": "Pierna",
    "Glute Kickback (Machine)": "Pierna",
    "Glute Kickback on Floor": "Pierna",
    "Goblet Squat": "Pierna",
    "Hack Squat": "Pierna",
    "Hack Squat (Machine)": "Pierna",
    "Hip Abduction (Machine)": "Pierna",
    "Hip Adduction (Machine)": "Pierna",
    "Hip Thrust": "Pierna",
    "Hip Thrust (Barbell)": "Pierna",
    "Hip Thrust (Machine)": "Pierna",
    "Hip Thrust (Smith Machine)": "Pierna",
    "Jump Squat": "Pierna",
    "Leg Extension (Machine)": "Pierna",
    "Leg Press (Machine)": "Pierna",
    "Leg Press Horizontal (Machine)": "Pierna",
    "Lunge": "Pierna",
    "Lunge (Barbell)": "Pierna",
    "Lunge (Dumbbell)": "Pierna",
    "Lying Leg Curl (Machine)": "Pierna",
    "Nordic Hamstrings Curls": "Pierna",
    "Pause Squat (Barbell)": "Pierna",
    "Pendulum Squat (Machine)": "Pierna",
    "Pistol Squat": "Pierna",
    "Reverse Lunge": "Pierna",
    "Reverse Lunge (Barbell)": "Pierna",
    "Reverse Lunge (Dumbbell)": "Pierna",
    "Romanian Deadlift (Barbell)": "Pierna",
    "Romanian Deadlift (Dumbbell)": "Pierna",
    "Seated Calf Raise": "Pierna",
    "Seated Leg Curl (Machine)": "Pierna",
    "Single Leg Extensions": "Pierna",
    "Single Leg Hip Thrust": "Pierna",
    "Single Leg Press (Machine)": "Pierna",
    "Single Leg Romanian Deadlift (Barbell)": "Pierna",
    "Single Leg Romanian Deadlift (Dumbbell)": "Pierna",
    "Sissy Squat (Weighted)": "Pierna",
    "Squat (Band)": "Pierna",
    "Squat (Barbell)": "Pierna",
    "Squat (Bodyweight)": "Pierna",
    "Squat (Dumbbell)": "Pierna",
    "Squat (Machine)": "Pierna",
    "Squat (Smith Machine)": "Pierna",
    "Standing Calf Raise": "Pierna",
    "Standing Calf Raise (Barbell)": "Pierna",
    "Standing Calf Raise (Dumbbell)": "Pierna",
    "Standing Calf Raise (Machine)": "Pierna",
    "Standing Calf Raise (Smith)": "Pierna",
    "Standing Leg Curls": "Pierna",
    "Step Up": "Pierna",
    "Stiff Leg Deadlift (Barbell)": "Pierna",
    "Sumo Squat": "Pierna",
    "Walking Lunge": "Pierna",
    "Walking Lunge (Dumbbell)": "Pierna",
    "Wall Sit": "Pierna",
    "Zercher Squat": "Pierna",

    // Bíceps
    "21s Bicep Curl": "Bíceps",
    "Bayesian": "Bíceps",
    "Behind the Back Bicep Curl (Cable)": "Bíceps",
    "Behind the Back Wrist Curl (Barbell)": "Bíceps",
    "Bicep Curl (Barbell)": "Bíceps",
    "Bicep Curl (Cable)": "Bíceps",
    "Bicep Curl (Dumbbell)": "Bíceps",
    "Bicep Curl (Machine)": "Bíceps",
    "Bicep Curl (Suspension)": "Bíceps",
    "Concentration Curl": "Bíceps",
    "Cross Body Hammer Curl": "Bíceps",
    "Curl Martillo Cable Unilateral": "Bíceps",
    "Drag Curl": "Bíceps",
    "EZ Bar Biceps Curl": "Bíceps",
    "Hammer Curl (Band)": "Bíceps",
    "Hammer Curl (Cable)": "Bíceps",
    "Hammer Curl (Dumbbell)": "Bíceps",
    "Overhead Curl (Cable)": "Bíceps",
    "Plate Curl": "Bíceps",
    "Preacher Curl (Barbell)": "Bíceps",
    "Preacher Curl (Dumbbell)": "Bíceps",
    "Preacher Curl (Machine)": "Bíceps",
    "Reverse Curl (Barbell)": "Bíceps",
    "Reverse Curl (Cable)": "Bíceps",
    "Reverse Curl (Dumbbell)": "Bíceps",
    "Seated Incline Curl (Dumbbell)": "Bíceps",
    "Single Arm Curl (Cable)": "Bíceps",
    "Spider Curl (Barbell)": "Bíceps",
    "Spider Curl (Dumbbell)": "Bíceps",
    "Wrist Curl (Barbell)": "Bíceps",
    "Wrist Curl (Dumbbell)": "Bíceps",
    "Zottman Curl (Dumbbell)": "Bíceps",

    // Tríceps
    "Bench Dip": "Tríceps",
    "Diamond Push Up": "Tríceps",
    "EZ Bar Skullcrusher": "Tríceps",
    "Floor Triceps Dip": "Tríceps",
    "Overhead Triceps Extension (Cable)": "Tríceps",
    "Seated Dip Machine": "Tríceps",
    "Seated Triceps Press": "Tríceps",
    "Single Arm Triceps Pushdown (Cable)": "Tríceps",
    "Skullcrusher (Barbell)": "Tríceps",
    "Skullcrusher (Dumbbell)": "Tríceps",
    "Triceps Dip": "Tríceps",
    "Triceps Dip (Assisted)": "Tríceps",
    "Triceps Dip (Weighted)": "Tríceps",
    "Triceps Extension (Barbell)": "Tríceps",
    "Triceps Extension (Cable)": "Tríceps",
    "Triceps Extension (Dumbbell)": "Tríceps",
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

    // Abdomen / Core
    "Ab Wheel": "Abdomen",
    "Bicycle Crunch": "Abdomen",
    "Cable Crunch": "Abdomen",
    "Cable Twist": "Abdomen",
    "Crunch": "Abdomen",
    "Crunch (Machine)": "Abdomen",
    "Crunch (Weighted)": "Abdomen",
    "Dead Bug": "Abdomen",
    "Decline Crunch": "Abdomen",
    "Decline Crunch (Weighted)": "Abdomen",
    "Dragon Flag": "Abdomen",
    "Dragonfly": "Abdomen",
    "Hanging Knee Raise": "Abdomen",
    "Hanging Leg Raise": "Abdomen",
    "Hollow Rock": "Abdomen",
    "Jackknife (Suspension)": "Abdomen",
    "Knee Raise Parallel Bars": "Abdomen",
    "Leg Raise Parallel Bars": "Abdomen",
    "L-Sit Hold": "Abdomen",
    "Lying Leg Raise": "Abdomen",
    "Mountain Climber": "Abdomen",
    "Oblique Crunch": "Abdomen",
    "Plank": "Abdomen",
    "Reverse Crunch": "Abdomen",
    "Russian Twist (Bodyweight)": "Abdomen",
    "Russian Twist (Weighted)": "Abdomen",
    "Side Plank": "Abdomen",
    "Sit Up": "Abdomen",
    "Sit Up (Weighted)": "Abdomen",
    "Toes to Bar": "Abdomen",
    "Torso Rotation (Machine)": "Abdomen",
    "V Up": "Abdomen",
    "Woodchoppers": "Abdomen",

    // Cardio / Otro
    "Aerobics": "Cardio / Otro",
    "Air Bike": "Cardio / Otro",
    "Battle Ropes": "Cardio / Otro",
    "Burpee": "Cardio / Otro",
    "Climbing": "Cardio / Otro",
    "Cycling": "Cardio / Otro",
    "Elliptical Trainer": "Cardio / Otro",
    "Farmers Walk": "Cardio / Otro",
    "HIIT": "Cardio / Otro",
    "Hiking": "Cardio / Otro",
    "Jump Rope": "Cardio / Otro",
    "Jumping Jack": "Cardio / Otro",
    "Kettlebell Swing": "Cardio / Otro",
    "Rowing Machine": "Cardio / Otro",
    "Running": "Cardio / Otro",
    "Skiing": "Cardio / Otro",
    "Sled Push": "Cardio / Otro",
    "Spinning": "Cardio / Otro",
    "Sprints": "Cardio / Otro",
    "Stair Machine": "Cardio / Otro",
    "Stretching": "Cardio / Otro",
    "Swimming": "Cardio / Otro",
    "Thruster (Barbell)": "Cardio / Otro",
    "Treadmill": "Cardio / Otro",
    "Walking": "Cardio / Otro",
    "Yoga": "Cardio / Otro",
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
    "Incline Chest Press (Machine)": [
      ["Hombro", 0.5],
      ["Tríceps", 0.5]
    ],
    "Iso-Lateral Chest Press (Machine)": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Bench Press (Dumbbell)": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Bench Press (Smith Machine)": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Incline Bench Press (Smith Machine)": [
      ["Hombro", 0.5],
      ["Tríceps", 0.5]
    ],
    "Decline Bench Press (Barbell)": [
      ["Tríceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Chest Dip": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Chest Dip (Weighted)": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Dips": [
      ["Tríceps", 0.5],
      ["Hombro", 0.5]
    ],
    "Push Up": [
      ["Tríceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Bent Over Row (Barbell)": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Bent Over Row (Dumbbell)": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Dumbbell Row": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "T Bar Row": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Seated Row (Machine)": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Seated Cable Row - V Grip (Cable)": [
      ["Bíceps", 0.5],
      ["Hombro", 0.25]
    ],
    "Pull Up (Weighted)": [
      ["Bíceps", 0.5]
    ],
    "Lat Pulldown - Close Grip (Cable)": [
      ["Bíceps", 0.5]
    ],
    "Overhead Press (Barbell)": [
      ["Tríceps", 0.5]
    ],
    "Overhead Press (Dumbbell)": [
      ["Tríceps", 0.5]
    ],
    "Military Press (Barbell)": [
      ["Tríceps", 0.5]
    ],
    "Arnold Press (Dumbbell)": [
      ["Tríceps", 0.5]
    ],
    "Romanian Deadlift (Barbell)": [
      ["Espalda", 0.5]
    ],
    "Romanian Deadlift (Dumbbell)": [
      ["Espalda", 0.5]
    ],
    "Sumo Deadlift (Barbell)": [
      ["Pierna", 0.5]
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
  const DEFAULT_BODYWEIGHT_KG = 75.0;

  const EXERCISE_BIOMECHANICS_OVERRIDES = {
    'Leg Press (Machine)': [0.0, 1, 0.50, false, 'Prensa 45°'],
    'Leg Press Horizontal (Machine)': [0.0, 1, 0.90, false, 'Prensa Horiz.'],
    'Single Leg Press (Machine)': [0.0, 2, 0.50, false, 'Prensa 1 Pierna'],
    'Hack Squat (Machine)': [0.85, 1, 0.85, false, 'Hacka'],
    'Pendulum Squat (Machine)': [0.75, 1, 0.85, false, 'Péndulo'],
    'Belt Squat (Machine)': [0.65, 1, 0.90, false, 'Sentadilla Cinturón'],
    'Squat (Barbell)': [0.75, 1, 1.00, false, 'Sentadilla Libre'],
    'Front Squat': [0.75, 1, 1.00, false, 'Sentadilla Frontal'],
    'Overhead Squat': [0.75, 1, 1.00, false, 'Sentadilla Overhead'],
    'Box Squat (Barbell)': [0.75, 1, 1.00, false, 'Sentadilla Cajón'],
    'Pause Squat (Barbell)': [0.75, 1, 1.00, false, 'Sentadilla Pausa'],
    'Squat (Smith Machine)': [0.75, 1, 0.88, false, 'Multipower + PC'],
    'Goblet Squat': [0.75, 1, 1.00, false, 'Peso Libre + PC'],
    'Squat (Dumbbell)': [0.75, 2, 1.00, false, 'Mancuernas + PC'],
    'Squat (Bodyweight)': [0.75, 1, 1.00, false, 'Peso Corporal'],
    'Jump Squat': [0.75, 1, 1.00, false, 'Peso Corporal'],
    'Leg Extension (Machine)': [0.0, 1, 0.75, false, 'Máquina Pierna'],
    'Seated Leg Curl (Machine)': [0.0, 1, 0.75, false, 'Máquina Pierna'],
    'Lying Leg Curl (Machine)': [0.0, 1, 0.75, false, 'Máquina Pierna'],
    'Hip Thrust (Machine)': [0.0, 1, 0.75, false, 'Máquina Glúteo'],
    'Hip Thrust (Barbell)': [0.0, 1, 0.85, false, 'Empuje Cadera'],
    'Hip Adduction (Machine)': [0.0, 1, 0.45, false, 'Máquina Aductor'],
    'Hip Abduction (Machine)': [0.0, 1, 0.45, false, 'Máquina Abductor'],
    'Calf Extension (Machine)': [0.0, 1, 0.55, false, 'Prensa Gemelo'],
    'Calf Press (Machine)': [0.0, 1, 0.55, false, 'Prensa Gemelo'],
    'Standing Calf Raise (Smith)': [0.75, 1, 0.85, false, 'Multipower + PC'],
    'Seated Calf Raise': [0.0, 1, 0.75, false, 'Máquina Gemelo'],

    'Lateral Raise (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Lateral Raise (Machine)': [0.0, 1, 0.40, false, 'Máquina Hombro'],
    'Lateral Raise (Dumbbell)': [0.0, 2, 1.00, false, 'Mancuernas ×2'],
    'Lateral Raise (Band)': [0.0, 2, 0.80, false, 'Banda Unil.'],
    'Rear Delt Reverse Fly (Machine)': [0.0, 1, 0.55, false, 'Máquina Hombro'],
    'Reverse Fly Single Arm (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Face Pull': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Seated Shoulder Press (Machine)': [0.0, 1, 0.80, false, 'Máquina Hombro'],

    'Butterfly (Pec Deck)': [0.0, 1, 0.55, false, 'Máquina Pec Deck'],
    'Chest Press (Machine)': [0.0, 1, 0.80, false, 'Máquina Palanca'],
    'Incline Chest Press (Machine)': [0.0, 1, 0.80, false, 'Máquina Palanca'],
    'Iso-Lateral Chest Press (Machine)': [0.0, 1, 0.80, false, 'Máquina Palanca'],
    'Cable Fly Crossovers': [0.0, 2, 0.50, false, 'Polea 2:1 Dual'],
    'Low Cable Fly Crossovers': [0.0, 2, 0.50, false, 'Polea 2:1 Dual'],
    'Seated Chest Flys (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Dual'],
    'Single Arm Cable Crossover': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Pullover (Dumbbell)': [0.0, 1, 1.00, false, 'Mancuerna Única'],
    'Lat Pulldown (Cable)': [0.0, 1, 1.00, false, 'Polea 1:1 Bilat.'],
    'Lat Pulldown - Close Grip (Cable)': [0.0, 1, 1.00, false, 'Polea 1:1 Bilat.'],
    'Lat Pulldown (Machine)': [0.0, 1, 0.85, false, 'Máquina Palanca'],
    'Seated Cable Row - Bar Grip': [0.0, 1, 1.00, false, 'Polea 1:1 Remo'],
    'Seated Cable Row - Bar Wide Grip': [0.0, 1, 1.00, false, 'Polea 1:1 Remo'],
    'Seated Cable Row - V Grip (Cable)': [0.0, 1, 1.00, false, 'Polea 1:1 Remo'],
    'Seated Row (Machine)': [0.0, 1, 0.80, false, 'Máquina Palanca'],
    'Iso-Lateral Row (Machine)': [0.0, 1, 0.70, false, 'Máquina Palanca'],
    'Iso-Lateral High Row (Machine)': [0.0, 1, 0.70, false, 'Máquina Palanca'],
    'Iso-Lateral Low Row': [0.0, 1, 0.70, false, 'Máquina Palanca'],
    'Single Arm Cable Row': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Rope Straight Arm Pulldown': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Straight Arm Lat Pulldown (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Preacher Curl (Machine)': [0.0, 1, 0.70, false, 'Máquina Bíceps'],
    'Bayesian': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Curl Martillo Cable Unilateral': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Bicep Curl (Cable)': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Hammer Curl (Cable)': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Triceps Extension (Cable)': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Overhead Triceps Extension (Cable)': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Triceps Pushdown': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Triceps Pressdown': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Triceps Rope Pushdown': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Single Arm Triceps Pushdown (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Triceps Kickback (Cable)': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Tríceps Bastardo': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Tríceps Bastardo Alto Barra': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Tríceps Lonamico': [0.0, 2, 0.50, false, 'Polea 2:1 Unil.'],
    'Tríceps En Abdominales': [0.0, 1, 0.50, false, 'Polea 2:1 Bilat.'],
    'Triceps Extension (Machine)': [0.0, 1, 0.75, false, 'Máquina Tríceps'],
    'Behind the Back Wrist Curl (Barbell)': [0.0, 1, 1.00, false, 'Peso Libre'],

    'Crunch (Machine)': [0.0, 1, 0.70, false, 'Máquina Abdomen'],
    'Dragonfly': [0.65, 1, 1.00, false, 'Peso Corporal'],
    'Decline Crunch': [0.40, 1, 1.00, false, 'Peso Corporal'],
    'Decline Crunch (Weighted)': [0.40, 1, 1.00, false, 'PC + Lastre'],
    'Crunch (Weighted)': [0.35, 1, 1.00, false, 'PC + Lastre'],
  };

  function inferBiomechanics(exerciseTitle) {
    const ov = EXERCISE_BIOMECHANICS_OVERRIDES[exerciseTitle];
    if (ov) return { bw_ratio: ov[0], bilateral: ov[1], mech_factor: ov[2], is_assisted: ov[3], profile: ov[4] };

    const tl = exerciseTitle.toLowerCase();
    const isUnil = ['single arm', 'one arm', 'single leg', 'unilateral', 'concentration curl'].some((k) => tl.includes(k));

    if (tl.includes('(assisted)')) {
      return { bw_ratio: 1.0, bilateral: 1, mech_factor: 1.0, is_assisted: true, profile: 'Asistida (PC - Asist.)' };
    }
    if (['pull up', 'chin up', 'chest dip', 'triceps dip', 'muscle up'].some((k) => tl.includes(k)) || tl === 'dips') {
      return { bw_ratio: 1.0, bilateral: 1, mech_factor: 1.0, is_assisted: false, profile: 'Peso Corporal 100%' };
    }
    if (tl.includes('push up')) {
      const bwR = tl.includes('incline') ? 0.45 : (tl.includes('decline') ? 0.75 : 0.65);
      return { bw_ratio: bwR, bilateral: 1, mech_factor: 1.0, is_assisted: false, profile: 'Peso Corporal' };
    }
    if (['bulgarian', 'split squat', 'lunge', 'step up'].some((k) => tl.includes(k))) {
      const bilat = (tl.includes('(dumbbell)') || tl.includes('(kettlebell)')) ? 2 : 1;
      return { bw_ratio: 0.70, bilateral: bilat, mech_factor: 1.0, is_assisted: false, profile: 'Unil. + Peso Corp.' };
    }
    if (tl.includes('squat') && tl.includes('(machine)')) {
      return { bw_ratio: 0.70, bilateral: 1, mech_factor: 0.85, is_assisted: false, profile: 'Máquina Sentadilla' };
    }
    if (tl.includes('(smith machine)')) {
      const bwR = ['squat', 'lunge', 'calf'].some((k) => tl.includes(k)) ? 0.75 : 0.0;
      return { bw_ratio: bwR, bilateral: 1, mech_factor: 0.85, is_assisted: false, profile: 'Multipower' };
    }
    if (tl.includes('(dumbbell)') || tl.includes('(kettlebell)')) {
      const twoHandSingle = ['pullover', 'goblet', 'shrug'].some((k) => tl.includes(k));
      return { bw_ratio: 0.0, bilateral: twoHandSingle ? 1 : 2, mech_factor: 1.0, is_assisted: false, profile: twoHandSingle ? 'Mancuerna ×1' : 'Mancuernas ×2' };
    }
    if (tl.includes('(cable)')) {
      const bilat = (isUnil || tl.includes('crossover') || tl.includes('fly')) ? 2 : 1;
      return { bw_ratio: 0.0, bilateral: bilat, mech_factor: 0.50, is_assisted: false, profile: 'Polea 2:1' };
    }
    if (tl.includes('(machine)')) {
      return { bw_ratio: 0.0, bilateral: isUnil ? 2 : 1, mech_factor: 0.75, is_assisted: false, profile: 'Máquina Palanca' };
    }
    if (['crunch', 'leg raise', 'knee raise', 'sit up', 'plank', 'ab wheel', 'russian twist', 'v-up', 'side bend'].some((k) => tl.includes(k))) {
      const bwR = (tl.includes('hanging') || tl.includes('leg raise')) ? 0.50 : 0.35;
      return { bw_ratio: bwR, bilateral: 1, mech_factor: 1.0, is_assisted: false, profile: 'Abdomen PC' };
    }
    if (tl.includes('back extension') || tl.includes('hyperextension')) {
      return { bw_ratio: 0.45, bilateral: 1, mech_factor: 1.0, is_assisted: false, profile: 'PC + Lastre' };
    }
    if (tl.includes('(barbell)') || tl.includes('(ez bar)') || tl.includes('(trap bar)')) {
      return { bw_ratio: 0.0, bilateral: 1, mech_factor: 1.0, is_assisted: false, profile: 'Peso Libre Barra' };
    }
    return { bw_ratio: 0.0, bilateral: isUnil ? 2 : 1, mech_factor: 1.0, is_assisted: false, profile: 'Estándar' };
  }

  function calcBalancedWeight(weightKg, reps, muscleGroup, bio, bwKg = DEFAULT_BODYWEIGHT_KG) {
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
    return round(base * bilateral * mech, 1);
  }

  const ORDERED_ROUTINES = [
    'Push (Empuje)',
    'Pull (Tirón)',
    'Legs (Pierna)',
    'Espalda y Pecho',
    'Hombro y Brazos',
    'Torso',
    'Full Body',
    'Brazos',
    'Core / Abdomen',
    'General / Otro',
  ];

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

  const ROUTINE_TITLE_PATTERNS = [
    ['Full Body', /\bfull\s*body\b|\bfullbody\b|cuerpo\s+completo|todo\s+el\s+cuerpo/],
    ['Espalda y Pecho', /espalda\s*(?:y|&|\/|\+|con)\s*pecho|pecho\s*(?:y|&|\/|\+|con)\s*espalda|pechalda|espalcho|back\s*(?:and|&|\/|\+)\s*chest|chest\s*(?:and|&|\/|\+)\s*back/],
    ['Hombro y Brazos', /hombros?\s*(?:y|&|\/|\+|con)\s*brazos?|brazos?\s*(?:y|&|\/|\+|con)\s*hombros?|shoulders?\s*(?:and|&|\/|\+)\s*arms?|arms?\s*(?:and|&|\/|\+)\s*shoulders?/],
    ['Legs (Pierna)', /\blegs?\b|\bpiernas?\b|\bpatas?\b|\bcuadris?\b|\blower\b|tren\s+inferior|\bgl[uú]teos?\b|\bfemoral|\bisquios?/],
    ['Torso', /\btorso\b|\bupper\b|tren\s+superior/],
    ['Push (Empuje)', /\bpush\b|\bempuje\b/],
    ['Pull (Tirón)', /\bpull\b|\btir[oó]n\b/],
    ['Brazos', /\bbrazos?\b|\barms?\b|\bb[ií]ceps\b|\btr[ií]ceps\b/],
    ['Core / Abdomen', /\babdomen\b|\babs\b|\bcore\b|abdominal/],
  ];

  function detectRoutineCategory(title, sets) {
    const t = title.toLowerCase();
    for (const [category, pattern] of ROUTINE_TITLE_PATTERNS) {
      if (pattern.test(t)) return category;
    }

    const volByMuscle = {};
    const setsByMuscle = {};
    for (const s of sets) {
      const m = EXERCISE_MUSCLE_MAP[s.exercise_title] || 'Otro';
      volByMuscle[m] = (volByMuscle[m] || 0) + s.volume_kg;
      setsByMuscle[m] = (setsByMuscle[m] || 0) + 1;
    }

    const volPecho = volByMuscle['Pecho'] || 0;
    const volEspalda = volByMuscle['Espalda'] || 0;
    const volHombro = volByMuscle['Hombro'] || 0;
    const volBiceps = volByMuscle['Bíceps'] || 0;
    const volTriceps = volByMuscle['Tríceps'] || 0;
    const volLegs = volByMuscle['Pierna'] || 0;
    const volAbdomen = volByMuscle['Abdomen'] || 0;

    const volArms = volBiceps + volTriceps;
    const volPush = volPecho + volHombro + volTriceps;
    const volPull = volEspalda + volBiceps;
    const volUpper = volPecho + volEspalda + volHombro + volArms;
    const total = volUpper + volLegs;

    const setsPecho = setsByMuscle['Pecho'] || 0;
    const setsEspalda = setsByMuscle['Espalda'] || 0;
    const setsHombro = setsByMuscle['Hombro'] || 0;
    const setsArms = (setsByMuscle['Bíceps'] || 0) + (setsByMuscle['Tríceps'] || 0);
    const setsLegs = setsByMuscle['Pierna'] || 0;
    const setsUpper = setsPecho + setsEspalda + setsHombro + setsArms;
    const totalSets = setsUpper + setsLegs;

    if (total === 0) {
      return (volAbdomen > 0 || (setsByMuscle['Abdomen'] || 0) > 0) ? 'Core / Abdomen' : 'General / Otro';
    }

    if (
      totalSets > 0 &&
      setsLegs >= 2 &&
      (setsPecho >= 2 || setsEspalda >= 2) &&
      (setsLegs / totalSets >= 0.20) &&
      (setsUpper / totalSets >= 0.40)
    ) {
      return 'Full Body';
    }

    if (
      setsPecho >= 2 &&
      setsEspalda >= 2 &&
      setsUpper > 0 &&
      ((setsPecho + setsEspalda) / setsUpper >= 0.40) &&
      (volPecho + volEspalda > 0) &&
      (volPecho / (volPecho + volEspalda) >= 0.25) &&
      (volEspalda / (volPecho + volEspalda) >= 0.25)
    ) {
      return 'Espalda y Pecho';
    }

    if (setsHombro >= 2 && setsArms >= 2 && setsPecho <= 1 && setsEspalda <= 1 && setsLegs <= 2) {
      return 'Hombro y Brazos';
    }

    if (volArms / total >= 0.65 && setsPecho <= 1 && setsEspalda <= 1) {
      return 'Brazos';
    }

    if (volLegs / total > 0.45) return 'Legs (Pierna)';
    if (volPush / total > 0.55) return 'Push (Empuje)';
    if (volPull / total > 0.55) return 'Pull (Tirón)';
    if (volPush / total > 0.30 && volPull / total > 0.30) return 'Torso';
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
      let maxWeight = 0;
      const exVol = {}, exMaxOrm = {}, exMaxWeight = {}, mVol = {}, mMaxOrm = {}, mMaxWeight = {}, mSetsDirect = {}, mSetsFrac = {};
      const prs = [];
      const grouped = {};

      for (const s of sess.sets) {
        const ex = s.exercise_title, m = s.muscle_group;
        allExercises.add(ex);
        totalVol += s.volume_kg;
        if (s.weight_kg > maxWeight) maxWeight = s.weight_kg;
        add(exVol, ex, s.volume_kg);
        add(mVol, m, s.volume_kg);
        mSetsDirect[m] = (mSetsDirect[m] || 0) + 1;
        add(mSetsFrac, m, 1.0, 2);
        for (const [ms, wt] of s.secondary_muscles) add(mSetsFrac, ms, wt, 2);
        if (s.estimated_1rm > (exMaxOrm[ex] || 0)) exMaxOrm[ex] = s.estimated_1rm;
        if (s.estimated_1rm > (mMaxOrm[m] || 0)) mMaxOrm[m] = s.estimated_1rm;
        if (s.weight_kg > (exMaxWeight[ex] || 0)) exMaxWeight[ex] = s.weight_kg;
        if (s.weight_kg > (mMaxWeight[m] || 0)) mMaxWeight[m] = s.weight_kg;
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
        max_weight: round(maxWeight, 1),
        exercise_volumes: exVol,
        exercise_max_orm: exMaxOrm,
        exercise_max_weight: exMaxWeight,
        muscle_volumes: mVol,
        muscle_max_orm: mMaxOrm,
        muscle_max_weight: mMaxWeight,
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

    const balanceMap = {};
    for (const ex of new Set([...Object.keys(EXERCISE_MUSCLE_MAP), ...allExercises])) {
      balanceMap[ex] = inferBiomechanics(ex);
    }

    // Second pass: biomechanically balanced metrics (equivalent kg)
    for (const sess of sessions) {
      let balTotal = 0;
      let balMaxWeight = 0;
      const balExVol = {}, balMVol = {}, balMVolFrac = {}, mVolFrac = {}, balExOrm = {}, balMOrm = {}, balExWeight = {}, balMWeight = {};

      for (const s of sess.sets) {
        const ex = s.exercise_title, m = s.muscle_group;
        const bio = balanceMap[ex] || inferBiomechanics(ex);
        const eqWeight = calcBalancedWeight(s.weight_kg, s.reps, m, bio, DEFAULT_BODYWEIGHT_KG);
        let balVol = 0, balOrm = 0;
        if (eqWeight > 0 && s.reps > 0) {
          balVol = round(eqWeight * s.reps, 1);
          balOrm = calc1rm(eqWeight, s.reps);
        }
        s.balanced_weight = eqWeight;
        s.balanced_volume = balVol;
        s.balanced_1rm = balOrm;

        balTotal += balVol;
        if (eqWeight > balMaxWeight) balMaxWeight = eqWeight;
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
        if (eqWeight > (balExWeight[ex] || 0)) balExWeight[ex] = eqWeight;
        if (eqWeight > (balMWeight[m] || 0)) balMWeight[m] = eqWeight;
      }

      Object.assign(sess, {
        balanced_total_volume: round(balTotal, 1),
        balanced_max_weight: round(balMaxWeight, 1),
        balanced_exercise_volumes: balExVol,
        balanced_muscle_volumes: balMVol,
        muscle_volumes_fractional: mVolFrac,
        balanced_muscle_volumes_fractional: balMVolFrac,
        balanced_exercise_max_orm: balExOrm,
        balanced_muscle_max_orm: balMOrm,
        balanced_exercise_max_weight: balExWeight,
        balanced_muscle_max_weight: balMWeight,
        balanced_sum_orm: round(Object.values(balExOrm).reduce((a, b) => a + b, 0), 1),
      });
    }

    return {
      sessions,
      exercises: [...allExercises].sort(),
      exercise_muscle_map: EXERCISE_MUSCLE_MAP,
      exercise_secondary_map: EXERCISE_SECONDARY_MUSCLES,
      exercise_balance_map: balanceMap,
      muscle_groups: ORDERED_MUSCLE_GROUPS,
      routine_categories: ORDERED_ROUTINES,
      min_date: sessions.length ? sessions[0].date_day : '',
      max_date: sessions.length ? sessions[sessions.length - 1].date_day : '',
      total_rows: totalRows,
    };
  }

  window.HevyCore = { parseCsv, EXERCISE_MUSCLE_MAP, EXERCISE_SECONDARY_MUSCLES, ORDERED_MUSCLE_GROUPS, ORDERED_ROUTINES, DEFAULT_BODYWEIGHT_KG, inferBiomechanics, calcBalancedWeight, calc1rm };
})();
