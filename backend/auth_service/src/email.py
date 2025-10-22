import logging
import smtplib
from email.mime.text import MIMEText

from src.settings import settings

logger = logging.getLogger("auth_service")

EMAIL_FROM = "noreply@projectanty.com"
SERVER = "smtp.gmail.com"
PORT = 587

def send_email(recipient: str, subject: str, message: str):

    message = MIMEText(message)
    message["Subject"] = subject
    message["From"] = EMAIL_FROM
    message["To"] = recipient

    try:
        with smtplib.SMTP(SERVER, PORT) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(EMAIL_FROM, [recipient], message.as_string())
        logger.info(f"Sent password reset email to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
