import json
import os
import re
import smtplib
import ssl
import sqlite3
from contextlib import closing
from email.message import EmailMessage
from pathlib import Path
from flask_cors import CORS

from dotenv import load_dotenv
from flask import Flask, current_app, g, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
PROJECTS = json.loads((BASE_DIR / "projects.json").read_text(encoding="utf-8"))


class MailConfigurationError(Exception):
    pass


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE_PATH"])
        g.db.row_factory = sqlite3.Row
    return g.db


def initialize_database(database_path):
    database_path = Path(database_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(database_path)) as connection, connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                tags TEXT NOT NULL,
                link TEXT NOT NULL DEFAULT '',
                image TEXT NOT NULL DEFAULT '',
                image_alt TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL
            )
            """
        )
        project_count = connection.execute(
            "SELECT COUNT(*) FROM projects"
        ).fetchone()[0]
        if project_count == 0:
            connection.executemany(
                """
                INSERT INTO projects
                    (title, category, description, tags, link, image, image_alt, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        project["title"],
                        project["category"],
                        project["description"],
                        json.dumps(project["tags"]),
                        project["link"],
                        project["image"],
                        project["image_alt"],
                        index,
                    )
                    for index, project in enumerate(PROJECTS)
                ],
            )


def send_contact_email(app, name, email, subject, message):
    host = app.config["SMTP_HOST"]
    sender = app.config["MAIL_FROM"]
    recipient = app.config["MAIL_TO"]
    username = app.config["SMTP_USERNAME"]
    password = app.config["SMTP_PASSWORD"]
    security = app.config["SMTP_SECURITY"]
    port = app.config["SMTP_PORT"]

    if not host or not sender or not recipient:
        raise MailConfigurationError("SMTP host, sender, and recipient are required.")
    if bool(username) != bool(password):
        raise MailConfigurationError("SMTP username and password must be configured together.")
    if security not in {"starttls", "ssl"}:
        raise MailConfigurationError("SMTP security must be 'starttls' or 'ssl'.")
    if not 1 <= port <= 65535:
        raise MailConfigurationError("SMTP port must be between 1 and 65535.")

    email_message = EmailMessage()
    email_message["Subject"] = f"Portfolio contact: {subject}"
    email_message["From"] = sender
    email_message["To"] = recipient
    email_message["Reply-To"] = email
    email_message.set_content(
        f"Name: {name}\nEmail: {email}\n\n{message}"
    )

    if security == "ssl":
        client = smtplib.SMTP_SSL(
            host, port, timeout=15, context=ssl.create_default_context()
        )
    else:
        client = smtplib.SMTP(host, port, timeout=15)

    with client:
        if security == "starttls":
            client.starttls(context=ssl.create_default_context())
        if username:
            client.login(username, password)
        client.send_message(email_message)



def create_app(test_config=None):
    app = Flask(__name__)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": ["https://haanibasheerporfolio.vercel.app"]
            }
        }
    )

    return app

    app.config.from_mapping(
        DATABASE_PATH=os.environ.get(
            "PORTFOLIO_DATABASE", str(BASE_DIR / "instance" / "portfolio.db")
        ),
        SMTP_HOST=os.environ.get("SMTP_HOST", ""),
        SMTP_PORT=int(os.environ.get("SMTP_PORT", "587")),
        SMTP_SECURITY=os.environ.get("SMTP_SECURITY", "starttls").lower(),
        SMTP_USERNAME=os.environ.get("SMTP_USERNAME", ""),
        SMTP_PASSWORD=os.environ.get("SMTP_PASSWORD", ""),
        MAIL_FROM=os.environ.get("MAIL_FROM", ""),
        MAIL_TO=os.environ.get("MAIL_TO", ""),
    )
    if test_config:
        app.config.update(test_config)
    initialize_database(app.config["DATABASE_PATH"])

    @app.teardown_appcontext
    def close_db(_error=None):
        database = g.pop("db", None)
        if database is not None:
            database.close()

    @app.get("/")
    def home():
        return send_from_directory(BASE_DIR, "index.html")

    @app.get("/api/projects")
    def list_projects():
        rows = get_db().execute(
            """
            SELECT title, category, description, tags, link, image, image_alt
            FROM projects
            ORDER BY sort_order, id
            """
        ).fetchall()
        return jsonify(
            [
                {
                    **dict(row),
                    "tags": json.loads(row["tags"]),
                }
                for row in rows
            ]
        )

    @app.post("/api/contact")
    def contact():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(error="Please submit a valid contact form."), 400

        if payload.get("website"):
            return jsonify(error="Invalid contact form submission."), 400

        fields = {}
        limits = {"name": 100, "email": 254, "subject": 160, "message": 5000}
        for field, limit in limits.items():
            value = payload.get(field)
            if not isinstance(value, str):
                return jsonify(error=f"Please provide a valid {field}."), 400
            value = value.strip()
            if not value or len(value) > limit:
                return jsonify(error=f"Please provide a valid {field}."), 400
            if field in {"name", "email", "subject"} and re.search(r"[\r\n]", value):
                return jsonify(error=f"Please provide a valid {field}."), 400
            fields[field] = value

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", fields["email"]):
            return jsonify(error="Please provide a valid email address."), 400

        try:
            send_contact_email(
                current_app._get_current_object(),
                fields["name"],
                fields["email"],
                fields["subject"],
                fields["message"],
            )
        except (MailConfigurationError, OSError, smtplib.SMTPException):
            current_app.logger.exception("Could not send portfolio contact email.")
            return (
                jsonify(
                    error="Your message could not be sent right now. Please try again later."
                ),
                503,
            )

        return jsonify(message="Thanks — your message has been sent."), 202

    @app.get("/<path:asset_path>")
    def static_assets(asset_path):
        if asset_path != "projects.json" and Path(asset_path).parts[0] not in {
            "assets",
            "css",
            "js",
        }:
            return jsonify(error="Not found."), 404
        return send_from_directory(BASE_DIR, asset_path)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
