"""
ChargeWay Backend - Flask REST API
Requirements: pip install flask flask-cors flask-sqlalchemy werkzeug openpyxl
Run: python app.py
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ─────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5173"])  # React dev ports

# DATABASE: SQLite for development, swap to PostgreSQL/MySQL for production
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "sqlite:///chargeway.db"
)
# For PostgreSQL use:  "postgresql://user:password@localhost:5432/chargeway"
# For MySQL use:       "mysql+pymysql://user:password@localhost/chargeway"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "changeme-in-production-use-random-string")

db = SQLAlchemy(app)

# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), nullable=False)
    email       = db.Column(db.String(150), unique=True, nullable=False)
    phone       = db.Column(db.String(15))
    password    = db.Column(db.String(255), nullable=False)  # hashed
    role        = db.Column(db.String(20), default="User")   # User | Station Manager | Admin
    join_date   = db.Column(db.Date, default=datetime.utcnow)
    # Car fields (stored flat for simplicity)
    car_id      = db.Column(db.Integer)
    car_brand   = db.Column(db.String(50))
    car_model   = db.Column(db.String(50))
    car_image   = db.Column(db.String(300))
    car_battery_kwh  = db.Column(db.