#!/usr/bin/env python3
"""
Hevy Workout Analyzer & Dashboard
Local web server (no cloud sync). Your data never leaves your machine.
Includes Routine, Muscle Group, Fractional Sets & Period Comparison
No external pip dependencies required.
"""

import os
import sys
import csv
import json
import re
import threading
import webbrowser
import time
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import urllib.request

# Support PyInstaller frozen bundle and standard python
if getattr(sys, "frozen", False):
    STATIC_DIR = os.path.join(sys._MEIPASS, "static")
    EXE_DIR = os.path.dirname(os.path.abspath(sys.executable))
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_DIR = os.path.join(EXE_DIR, "static")

DATA_DIR = os.path.join(EXE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CSV_PATH = os.path.join(DATA_DIR, "hevy_workouts.csv")
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

def _find_downloads_csv():
    """Fallback: a hevy_workouts.csv in the user's Downloads folder."""
    for folder in ("Downloads", "Descargas"):
        candidate = os.path.join(os.path.expanduser("~"), folder, "hevy_workouts.csv")
        if os.path.exists(candidate):
            return candidate
    return os.path.join(os.path.expanduser("~"), "Downloads", "hevy_workouts.csv")

DOWNLOADS_CSV = _find_downloads_csv()

SPANISH_MONTHS = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12,
    "jan": 1, "apr": 4, "aug": 8, "dec": 12
}

EXERCISE_MUSCLE_MAP = {
    # Pecho
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

    # Espalda
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

    # Hombros
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

    # Piernas
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

    # Bíceps
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

    # Tríceps
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

    # Abdomen / Core
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

    # Cardio / Otro
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
}

# Secondary/synergist muscles with fractional series weight (e.g. 0.5)
EXERCISE_SECONDARY_MUSCLES = {
    # Pecho multiarticulares -> Tríceps (0.5), Hombro anterior (0.5)
    "Bench Press (Barbell)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Bench Press - Close Grip (Barbell)": [("Tríceps", 0.75), ("Hombro", 0.25)],
    "Chest Press (Machine)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Incline Bench Press (Barbell)": [("Hombro", 0.5), ("Tríceps", 0.5)],
    "Incline Bench Press (Dumbbell)": [("Hombro", 0.5), ("Tríceps", 0.5)],

    # Espalda multiarticulares -> Bíceps (0.5), Hombro posterior (0.25)
    "Chest Supported Incline Row (Dumbbell)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Chin Up": [("Bíceps", 0.5)],
    "Chin Up (Weighted)": [("Bíceps", 0.5)],
    "Deadlift (Barbell)": [("Pierna", 0.5)],
    "Iso-Lateral Row (Machine)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Lat Pulldown (Cable)": [("Bíceps", 0.5)],
    "Lat Pulldown (Machine)": [("Bíceps", 0.5)],
    "Pendlay Row (Barbell)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Pull Up": [("Bíceps", 0.5)],
    "Rack Pull": [("Pierna", 0.5)],
    "Seated Cable Row - Bar Grip": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Seated Cable Row - Bar Wide Grip": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Single Arm Cable Row": [("Bíceps", 0.5), ("Hombro", 0.25)],

    # Hombros multiarticulares -> Tríceps (0.5)
    "Face Pull": [("Espalda", 0.5)],
    "Overhead Press (Smith Machine)": [("Tríceps", 0.5)],
    "Seated Shoulder Press (Machine)": [("Tríceps", 0.5)],
    "Shoulder Press (Dumbbell)": [("Tríceps", 0.5)],
    "Rear Delt Reverse Fly (Machine)": [("Espalda", 0.25)],
    "Incline Chest Press (Machine)": [("Hombro", 0.5), ("Tríceps", 0.5)],
    "Iso-Lateral Chest Press (Machine)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Bench Press (Dumbbell)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Bench Press (Smith Machine)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Incline Bench Press (Smith Machine)": [("Hombro", 0.5), ("Tríceps", 0.5)],
    "Decline Bench Press (Barbell)": [("Tríceps", 0.5), ("Hombro", 0.25)],
    "Chest Dip": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Chest Dip (Weighted)": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Dips": [("Tríceps", 0.5), ("Hombro", 0.5)],
    "Push Up": [("Tríceps", 0.5), ("Hombro", 0.25)],
    "Bent Over Row (Barbell)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Bent Over Row (Dumbbell)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Dumbbell Row": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "T Bar Row": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Seated Row (Machine)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Seated Cable Row - V Grip (Cable)": [("Bíceps", 0.5), ("Hombro", 0.25)],
    "Pull Up (Weighted)": [("Bíceps", 0.5)],
    "Lat Pulldown - Close Grip (Cable)": [("Bíceps", 0.5)],
    "Overhead Press (Barbell)": [("Tríceps", 0.5)],
    "Overhead Press (Dumbbell)": [("Tríceps", 0.5)],
    "Military Press (Barbell)": [("Tríceps", 0.5)],
    "Arnold Press (Dumbbell)": [("Tríceps", 0.5)],
    "Romanian Deadlift (Barbell)": [("Espalda", 0.5)],
    "Romanian Deadlift (Dumbbell)": [("Espalda", 0.5)],
    "Sumo Deadlift (Barbell)": [("Pierna", 0.5)],
    "Reverse Fly Single Arm (Cable)": [("Espalda", 0.25)],
}

ORDERED_MUSCLE_GROUPS = ["Pierna", "Espalda", "Pecho", "Bíceps", "Hombro", "Tríceps", "Abdomen", "Cardio / Otro"]
ORDERED_ROUTINES = [
    "Push (Empuje)",
    "Pull (Tirón)",
    "Legs (Pierna)",
    "Espalda y Pecho",
    "Hombro y Brazos",
    "Torso",
    "Full Body",
    "Brazos",
    "Core / Abdomen",
    "General / Otro",
]

CACHE = {
    "sessions": [],
    "exercises": [],
    "exercise_muscle_map": EXERCISE_MUSCLE_MAP,
    "exercise_secondary_map": EXERCISE_SECONDARY_MUSCLES,
    "muscle_groups": ORDERED_MUSCLE_GROUPS,
    "routine_categories": ORDERED_ROUTINES,
    "min_date": None,
    "max_date": None,
    "total_rows": 0,
    "source_info": "Ninguno"
}

def parse_hevy_date(date_str):
    if not date_str:
        return None
    cleaned = date_str.strip().lower()
    m = re.match(r"(\d+)\s+([a-z]+)\.?\s+(\d{4})(?:,\s+(\d{1,2}):(\d{2}))?", cleaned)
    if not m:
        return None
    day, mon_str, year, hr, mn = m.groups()
    mon_key = mon_str[:4] if mon_str[:4] in SPANISH_MONTHS else mon_str[:3]
    month = SPANISH_MONTHS.get(mon_key, 1)
    hr = int(hr) if hr else 0
    mn = int(mn) if mn else 0
    try:
        return datetime(int(year), month, int(day), hr, mn)
    except Exception:
        return None

def calc_1rm(weight, reps):
    if weight <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(float(weight), 1)
    return round(float(weight) * (1.0 + float(reps) / 30.0), 1)

ROUTINE_TITLE_PATTERNS = [
    ("Full Body", re.compile(r"\bfull\s*body\b|\bfullbody\b|cuerpo\s+completo|todo\s+el\s+cuerpo")),
    ("Espalda y Pecho", re.compile(r"espalda\s*(?:y|&|/|\+|con)\s*pecho|pecho\s*(?:y|&|/|\+|con)\s*espalda|pechalda|espalcho|back\s*(?:and|&|/|\+)\s*chest|chest\s*(?:and|&|/|\+)\s*back")),
    ("Hombro y Brazos", re.compile(r"hombros?\s*(?:y|&|/|\+|con)\s*brazos?|brazos?\s*(?:y|&|/|\+|con)\s*hombros?|shoulders?\s*(?:and|&|/|\+)\s*arms?|arms?\s*(?:and|&|/|\+)\s*shoulders?")),
    ("Legs (Pierna)", re.compile(r"\blegs?\b|\bpiernas?\b|\bpatas?\b|\bcuadris?\b|\blower\b|tren\s+inferior|\bgl[uú]teos?\b|\bfemoral|\bisquios?")),
    ("Torso", re.compile(r"\btorso\b|\bupper\b|tren\s+superior")),
    ("Push (Empuje)", re.compile(r"\bpush\b|\bempuje\b")),
    ("Pull (Tirón)", re.compile(r"\bpull\b|\btir[oó]n\b")),
    ("Brazos", re.compile(r"\bbrazos?\b|\barms?\b|\bb[ií]ceps\b|\btr[ií]ceps\b")),
    ("Core / Abdomen", re.compile(r"\babdomen\b|\babs\b|\bcore\b|abdominal")),
]

def detect_routine_category(title, sets):
    t = title.lower()
    for category, pattern in ROUTINE_TITLE_PATTERNS:
        if pattern.search(t):
            return category

    vol_by_muscle = {}
    sets_by_muscle = {}
    for s in sets:
        m = EXERCISE_MUSCLE_MAP.get(s["exercise_title"], "Otro")
        vol_by_muscle[m] = vol_by_muscle.get(m, 0.0) + s["volume_kg"]
        sets_by_muscle[m] = sets_by_muscle.get(m, 0) + 1

    vol_pecho = vol_by_muscle.get("Pecho", 0.0)
    vol_espalda = vol_by_muscle.get("Espalda", 0.0)
    vol_hombro = vol_by_muscle.get("Hombro", 0.0)
    vol_biceps = vol_by_muscle.get("Bíceps", 0.0)
    vol_triceps = vol_by_muscle.get("Tríceps", 0.0)
    vol_legs = vol_by_muscle.get("Pierna", 0.0)
    vol_abdomen = vol_by_muscle.get("Abdomen", 0.0)

    vol_arms = vol_biceps + vol_triceps
    vol_push = vol_pecho + vol_hombro + vol_triceps
    vol_pull = vol_espalda + vol_biceps
    vol_upper = vol_pecho + vol_espalda + vol_hombro + vol_arms
    total = vol_upper + vol_legs

    sets_pecho = sets_by_muscle.get("Pecho", 0)
    sets_espalda = sets_by_muscle.get("Espalda", 0)
    sets_hombro = sets_by_muscle.get("Hombro", 0)
    sets_arms = sets_by_muscle.get("Bíceps", 0) + sets_by_muscle.get("Tríceps", 0)
    sets_legs = sets_by_muscle.get("Pierna", 0)
    sets_upper = sets_pecho + sets_espalda + sets_hombro + sets_arms
    total_sets = sets_upper + sets_legs

    if total == 0:
        if vol_abdomen > 0 or sets_by_muscle.get("Abdomen", 0) > 0:
            return "Core / Abdomen"
        return "General / Otro"

    # Full Body: substantial lower body + upper body with chest/back work
    if (
        total_sets > 0
        and sets_legs >= 2
        and (sets_pecho >= 2 or sets_espalda >= 2)
        and (sets_legs / total_sets >= 0.20)
        and (sets_upper / total_sets >= 0.40)
    ):
        return "Full Body"

    # Espalda y Pecho (Arnold split / antagonist upper)
    if (
        sets_pecho >= 2
        and sets_espalda >= 2
        and sets_upper > 0
        and ((sets_pecho + sets_espalda) / sets_upper >= 0.40)
        and (vol_pecho + vol_espalda > 0)
        and (vol_pecho / (vol_pecho + vol_espalda) >= 0.25)
        and (vol_espalda / (vol_pecho + vol_espalda) >= 0.25)
    ):
        return "Espalda y Pecho"

    # Hombro y Brazos (Arnold split)
    if sets_hombro >= 2 and sets_arms >= 2 and sets_pecho <= 1 and sets_espalda <= 1 and sets_legs <= 2:
        return "Hombro y Brazos"

    # Solo Brazos
    if vol_arms / total >= 0.65 and sets_pecho <= 1 and sets_espalda <= 1:
        return "Brazos"

    if vol_legs / total > 0.45:
        return "Legs (Pierna)"
    if vol_push / total > 0.55:
        return "Push (Empuje)"
    if vol_pull / total > 0.55:
        return "Pull (Tirón)"
    if (vol_push / total > 0.30) and (vol_pull / total > 0.30):
        return "Torso"
    return "General / Otro"

def load_and_parse_csv(filepath):
    if not os.path.exists(filepath):
        if os.path.exists(DOWNLOADS_CSV):
            filepath = DOWNLOADS_CSV
        else:
            return False, f"Archivo no encontrado en {filepath}"

    workouts_map = {}
    total_rows = 0

    with open(filepath, mode="r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            start_str = (row.get("start_time") or "").strip()
            title = (row.get("title") or "Entrenamiento").strip()
            if not start_str:
                continue

            session_key = (start_str, title)
            if session_key not in workouts_map:
                dt = parse_hevy_date(start_str)
                end_str = (row.get("end_time") or "").strip()
                end_dt = parse_hevy_date(end_str)
                
                duration_min = 0
                if dt and end_dt and end_dt >= dt:
                    duration_min = int((end_dt - dt).total_seconds() / 60)

                workouts_map[session_key] = {
                    "id": f"sess_{len(workouts_map)}",
                    "title": title,
                    "start_time_str": start_str,
                    "end_time_str": end_str,
                    "date_iso": dt.strftime("%Y-%m-%d %H:%M") if dt else start_str,
                    "date_day": dt.strftime("%Y-%m-%d") if dt else "",
                    "timestamp": dt.timestamp() if dt else 0,
                    "duration_min": duration_min,
                    "description": (row.get("description") or "").strip(),
                    "sets": []
                }

            try:
                w_kg = float(row.get("weight_kg") or 0)
            except Exception:
                w_kg = 0.0

            try:
                reps = int(float(row.get("reps") or 0))
            except Exception:
                reps = 0

            set_type = (row.get("set_type") or "normal").strip().lower()
            ex_title = (row.get("exercise_title") or "Sin ejercicio").strip()
            ex_notes = (row.get("exercise_notes") or "").strip()
            rpe = (row.get("rpe") or "").strip()

            orm = calc_1rm(w_kg, reps)
            set_vol = round(w_kg * reps, 1)
            muscle = EXERCISE_MUSCLE_MAP.get(ex_title, "Otro")
            secondary = EXERCISE_SECONDARY_MUSCLES.get(ex_title, [])

            set_obj = {
                "set_index": int(row.get("set_index") or len(workouts_map[session_key]["sets"])),
                "exercise_title": ex_title,
                "muscle_group": muscle,
                "secondary_muscles": secondary,
                "set_type": set_type,
                "weight_kg": w_kg,
                "reps": reps,
                "volume_kg": set_vol,
                "estimated_1rm": orm,
                "rpe": rpe,
                "exercise_notes": ex_notes,
                "is_pr": False
            }
            workouts_map[session_key]["sets"].append(set_obj)

    sorted_sessions = sorted(workouts_map.values(), key=lambda w: w["timestamp"])

    exercise_history_max = {}
    all_exercises = set()

    for sess in sorted_sessions:
        total_vol = 0.0
        max_weight = 0.0
        ex_volumes = {}
        ex_max_orm = {}
        ex_max_weight = {}
        muscle_volumes = {}
        muscle_max_orm = {}
        muscle_max_weight = {}
        muscle_sets_direct = {}
        muscle_sets_fractional = {}
        sess_prs = []
        
        grouped_exercises = {}

        for s in sess["sets"]:
            ex = s["exercise_title"]
            m = s["muscle_group"]
            all_exercises.add(ex)
            
            total_vol += s["volume_kg"]
            if s["weight_kg"] > max_weight:
                max_weight = s["weight_kg"]
            ex_volumes[ex] = round(ex_volumes.get(ex, 0.0) + s["volume_kg"], 1)
            muscle_volumes[m] = round(muscle_volumes.get(m, 0.0) + s["volume_kg"], 1)

            # Direct set count (+1.0)
            muscle_sets_direct[m] = muscle_sets_direct.get(m, 0) + 1
            # Fractional set count (+1.0 to primary, +w to secondary)
            muscle_sets_fractional[m] = round(muscle_sets_fractional.get(m, 0.0) + 1.0, 2)
            for m_sec, w in s["secondary_muscles"]:
                muscle_sets_fractional[m_sec] = round(muscle_sets_fractional.get(m_sec, 0.0) + w, 2)

            if s["estimated_1rm"] > ex_max_orm.get(ex, 0.0):
                ex_max_orm[ex] = s["estimated_1rm"]
            if s["estimated_1rm"] > muscle_max_orm.get(m, 0.0):
                muscle_max_orm[m] = s["estimated_1rm"]
            if s["weight_kg"] > ex_max_weight.get(ex, 0.0):
                ex_max_weight[ex] = s["weight_kg"]
            if s["weight_kg"] > muscle_max_weight.get(m, 0.0):
                muscle_max_weight[m] = s["weight_kg"]

            if ex not in grouped_exercises:
                grouped_exercises[ex] = []
            grouped_exercises[ex].append(s)

        for ex, max_orm in ex_max_orm.items():
            if max_orm > 0:
                prev_best = exercise_history_max.get(ex, 0.0)
                if max_orm > prev_best:
                    m = EXERCISE_MUSCLE_MAP.get(ex, "Otro")
                    sess_prs.append({
                        "exercise": ex,
                        "muscle_group": m,
                        "new_orm": max_orm,
                        "prev_best": prev_best
                    })
                    exercise_history_max[ex] = max_orm
                    for s in sess["sets"]:
                        if s["exercise_title"] == ex and s["estimated_1rm"] == max_orm:
                            s["is_pr"] = True

        sum_orm = round(sum(ex_max_orm.values()), 1)

        sess["total_volume"] = round(total_vol, 1)
        sess["max_weight"] = round(max_weight, 1)
        sess["exercise_volumes"] = ex_volumes
        sess["exercise_max_orm"] = ex_max_orm
        sess["exercise_max_weight"] = ex_max_weight
        sess["muscle_volumes"] = muscle_volumes
        sess["muscle_max_orm"] = muscle_max_orm
        sess["muscle_max_weight"] = muscle_max_weight
        sess["muscle_sets_direct"] = muscle_sets_direct
        sess["muscle_sets_fractional"] = muscle_sets_fractional
        sess["routine_category"] = detect_routine_category(sess["title"], sess["sets"])
        sess["sum_orm"] = sum_orm
        sess["prs_achieved"] = sess_prs
        sess["pr_count"] = len(sess_prs)
        sess["total_sets"] = len(sess["sets"])
        sess["total_reps"] = sum(s["reps"] for s in sess["sets"])
        sess["grouped_exercises"] = grouped_exercises

    CACHE["sessions"] = sorted_sessions
    CACHE["exercises"] = sorted(list(all_exercises))
    CACHE["total_rows"] = total_rows
    CACHE["min_date"] = sorted_sessions[0]["date_day"] if sorted_sessions else ""
    CACHE["max_date"] = sorted_sessions[-1]["date_day"] if sorted_sessions else ""

    # Second pass: compute balanced/normalized metrics relative to all-time 1RM per exercise
    for sess in sorted_sessions:
        bal_total_vol = 0.0
        bal_ex_volumes = {}
        bal_muscle_volumes = {}
        bal_muscle_volumes_fractional = {}
        muscle_volumes_fractional = {}
        bal_ex_max_orm = {}
        bal_muscle_max_orm = {}

        for s in sess["sets"]:
            ex = s["exercise_title"]
            m = s["muscle_group"]
            peak_1rm = exercise_history_max.get(ex, 0.0)

            if peak_1rm > 0 and s["weight_kg"] > 0 and s["reps"] > 0:
                bal_vol = round((s["weight_kg"] / peak_1rm) * s["reps"] * 100.0, 1)
                bal_orm = round((s["estimated_1rm"] / peak_1rm) * 100.0, 1)
            else:
                bal_vol = 0.0
                bal_orm = 0.0

            s["balanced_volume"] = bal_vol
            s["balanced_1rm"] = bal_orm

            bal_total_vol += bal_vol
            bal_ex_volumes[ex] = round(bal_ex_volumes.get(ex, 0.0) + bal_vol, 1)
            bal_muscle_volumes[m] = round(bal_muscle_volumes.get(m, 0.0) + bal_vol, 1)

            # Fractional volumes (1.0x primary + w*secondary)
            muscle_volumes_fractional[m] = round(muscle_volumes_fractional.get(m, 0.0) + s["volume_kg"], 1)
            bal_muscle_volumes_fractional[m] = round(bal_muscle_volumes_fractional.get(m, 0.0) + bal_vol, 1)
            for m_sec, w in s["secondary_muscles"]:
                muscle_volumes_fractional[m_sec] = round(muscle_volumes_fractional.get(m_sec, 0.0) + s["volume_kg"] * w, 1)
                bal_muscle_volumes_fractional[m_sec] = round(bal_muscle_volumes_fractional.get(m_sec, 0.0) + bal_vol * w, 1)

            if bal_orm > bal_ex_max_orm.get(ex, 0.0):
                bal_ex_max_orm[ex] = bal_orm
            if bal_orm > bal_muscle_max_orm.get(m, 0.0):
                bal_muscle_max_orm[m] = bal_orm

        sess["balanced_total_volume"] = round(bal_total_vol, 1)
        sess["balanced_exercise_volumes"] = bal_ex_volumes
        sess["balanced_muscle_volumes"] = bal_muscle_volumes
        sess["muscle_volumes_fractional"] = muscle_volumes_fractional
        sess["balanced_muscle_volumes_fractional"] = bal_muscle_volumes_fractional
        sess["balanced_exercise_max_orm"] = bal_ex_max_orm
        sess["balanced_muscle_max_orm"] = bal_muscle_max_orm
        sess["balanced_sum_orm"] = round(sum(bal_ex_max_orm.values()), 1)
    
    file_stat = os.stat(filepath)
    mtime_str = datetime.fromtimestamp(file_stat.st_mtime).strftime("%d/%m/%Y %H:%M")
    CACHE["source_info"] = f"{os.path.basename(filepath)} (Modificado: {mtime_str})"
    return True, "Datos cargados correctamente"

class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def _is_local_origin(self):
        """Block cross-site requests: only accept calls coming from this local page."""
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = urllib.parse.urlparse(origin).hostname
        return host in ("localhost", "127.0.0.1")

    def do_GET(self):
        url_parsed = urllib.parse.urlparse(self.path)
        path = url_parsed.path

        if path == "/api/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            
            resp_data = {
                "success": True,
                "sessions": CACHE["sessions"],
                "exercises": CACHE["exercises"],
                "exercise_muscle_map": CACHE["exercise_muscle_map"],
                "exercise_secondary_map": CACHE["exercise_secondary_map"],
                "muscle_groups": CACHE["muscle_groups"],
                "routine_categories": CACHE["routine_categories"],
                "min_date": CACHE["min_date"],
                "max_date": CACHE["max_date"],
                "total_rows": CACHE["total_rows"],
                "source_info": CACHE["source_info"]
            }
            self.wfile.write(json.dumps(resp_data, ensure_ascii=False).encode("utf-8"))
            return

        elif path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            resp = {
                "source_info": CACHE["source_info"],
                "session_count": len(CACHE["sessions"]),
                "min_date": CACHE["min_date"],
                "max_date": CACHE["max_date"],
                "exercises_count": len(CACHE["exercises"])
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        url_parsed = urllib.parse.urlparse(self.path)
        path = url_parsed.path

        if path == "/api/upload":
            if not self._is_local_origin():
                self.send_error(403, "Forbidden origin")
                return
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > MAX_UPLOAD_BYTES:
                self.send_error(413, "File too large or empty")
                return
            post_data = self.rfile.read(content_length)
            
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(CSV_PATH, "wb") as f:
                f.write(post_data)
            
            ok, msg = load_and_parse_csv(CSV_PATH)
            self.send_response(200 if ok else 400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": ok,
                "message": msg,
                "source_info": CACHE["source_info"],
                "session_count": len(CACHE["sessions"])
            }).encode("utf-8"))
            return

        self.send_error(404, "Endpoint not found")

def open_browser(port):
    time.sleep(1.2)
    url = f"http://localhost:{port}"
    print(f"🌐 Abriendo {url} en tu navegador...")
    try:
        webbrowser.open(url)
    except Exception:
        pass

def check_port_open(port):
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{port}/api/status", timeout=1.5)
        return req.getcode() == 200
    except Exception:
        return False

def run_server(port=5555):
    if check_port_open(port):
        print(f"ℹ️ El servidor Hevy Analytics ya está en ejecución en http://localhost:{port}")
        open_browser(port)
        return

    if os.path.exists(CSV_PATH):
        load_and_parse_csv(CSV_PATH)
    elif os.path.exists(DOWNLOADS_CSV):
        load_and_parse_csv(DOWNLOADS_CSV)
    
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, DashboardHandler)
    print(f"🚀 Hevy Dashboard Server running at http://localhost:{port}")
    print(f"📊 Loaded {len(CACHE['sessions'])} sessions ({CACHE['source_info']})")
    
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        httpd.server_close()

if __name__ == "__main__":
    port = 5555
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
