import smtplib
from email.mime.text import MIMEText

from shared.simple_logging import logger

from src.settings import settings

EMAIL_FROM = "noreply@projectanty.com"
SERVER = "smtp.gmail.com"
PORT = 587


def send_email(recipient: str, subject: str, message: str):
    message = MIMEText(message)
    message["Subject"] = subject
    message["From"] = EMAIL_FROM
    message["To"] = recipient

    try:
        logger.debug(f"Setup to send email from {settings.SMTP_USER}")
        with smtplib.SMTP_SSL(SERVER, 465, timeout=10) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, [recipient], message.as_string())
        logger.debug(f"Sent password reset email to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
