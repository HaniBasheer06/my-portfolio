# My Portfolio

A responsive portfolio website with a Python backend for project storage and
contact-form email.

## Folder Structure

- `index.html` - Main portfolio page
- `css/style.css` - Website styling
- `js/script.js` - JavaScript
- `app.py` - Flask application and JSON API
- `instance/portfolio.db` - SQLite database created on first run
- `assets/` - Images and resume

## Run the Website

The Flask backend provides the database-backed project list and contact form.
When the API is unavailable (for example, on a static host or VS Code Live
Server), the Work section loads the shared `projects.json` catalog instead.
The contact form still requires the Flask backend.

1. Create and activate a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Configure the mail settings below.
4. Start the website with `python app.py`.
5. Open `http://127.0.0.1:5000`.

The project list is initialized in SQLite from `projects.json` and loaded from
`GET /api/projects`. The database is created automatically on the first run.
Project data can be updated in the SQLite `projects` table for the Flask site;
update `projects.json` as well to keep the static-host fallback in sync.

## Email Configuration

Set these environment variables before starting the server:

- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (defaults to `587`)
- `SMTP_SECURITY` - `starttls` (default) or `ssl`
- `SMTP_USERNAME` and `SMTP_PASSWORD` - SMTP login; both must be set together
- `MAIL_FROM` - sender address accepted by the SMTP server
- `MAIL_TO` - recipient address for portfolio messages

Keep SMTP credentials in environment variables or your deployment platform's
secret manager; do not commit them to the repository. If email is not
configured, the contact form reports that messages are temporarily unavailable.

## Customize

Replace these files in `assets/` with your own:
- `profile.jpg`
- `project-movie.jpg`
- `project-security.jpg`
- `Hani_Basheer_CV.pdf`

Edit `index.html` to update your name, email, skills, and profile details.
Project descriptions and links are loaded from the SQLite database.

## Tests

Run the backend tests with `python -m unittest discover -s tests`.
