import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import create_app


class PortfolioAppTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.app = create_app(
            {
                "TESTING": True,
                "DATABASE_PATH": str(Path(self.temp_dir.name) / "portfolio.db"),
                "SMTP_HOST": "smtp.example.com",
                "MAIL_FROM": "portfolio@example.com",
                "MAIL_TO": "owner@example.com",
            }
        )
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_projects_are_loaded_from_sqlite(self):
        response = self.client.get("/api/projects")

        self.assertEqual(response.status_code, 200)
        projects = response.get_json()
        self.assertEqual(len(projects), 2)
        self.assertEqual(projects[0]["title"], "AI Cybersecurity Monitor")
        self.assertEqual(projects[0]["tags"], ["Python", "AI/ML", "Cybersecurity"])

    def test_homepage_and_assets_are_served(self):
        page = self.client.get("/")
        script = self.client.get("/js/script.js")
        projects = self.client.get("/projects.json")
        image = self.client.get("/assets/og-image.png")

        self.assertEqual(page.status_code, 200)
        self.assertIn(b'id="contact-form"', page.data)
        self.assertIn(b'property="og:image"', page.data)
        self.assertIn(b'https://hanibasheer06.github.io/my-portfolio/assets/og-image.png', page.data)
        self.assertEqual(script.status_code, 200)
        self.assertEqual(projects.status_code, 200)
        self.assertEqual(len(projects.get_json()), 2)
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.mimetype, "image/png")
        self.assertEqual(struct.unpack(">II", image.data[16:24]), (1200, 630))
        page.close()
        script.close()
        projects.close()
        image.close()

    def test_contact_rejects_invalid_email(self):
        response = self.client.post(
            "/api/contact",
            json={
                "name": "Visitor",
                "email": "not-an-email",
                "subject": "Hello",
                "message": "A message",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.get_json()["error"])

    @patch("app.send_contact_email")
    def test_contact_sends_valid_message(self, send_email):
        payload = {
            "name": "Visitor",
            "email": "visitor@example.com",
            "subject": "Hello",
            "message": "I would like to discuss a project.",
        }

        response = self.client.post("/api/contact", json=payload)

        self.assertEqual(response.status_code, 202)
        self.assertEqual(
            response.get_json(), {"message": "Thanks — your message has been sent."}
        )
        send_email.assert_called_once_with(
            self.app,
            "Visitor",
            "visitor@example.com",
            "Hello",
            "I would like to discuss a project.",
        )

    def test_contact_reports_missing_mail_configuration(self):
        self.app.config["SMTP_HOST"] = ""
        with self.assertLogs("app", level="ERROR"):
            response = self.client.post(
                "/api/contact",
                json={
                    "name": "Visitor",
                    "email": "visitor@example.com",
                    "subject": "Hello",
                    "message": "A message",
                },
            )

        self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
