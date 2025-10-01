import smtplib
from email.mime.text import MIMEText
import ssl # For secure connections (TLS/SSL)

msg = MIMEText("Hello from Python!")

me = "teamanty50@gmail.com"
you = "nicolasfan51@gmail.com"
msg['Subject'] = "Test Email"
msg['From'] = me
msg['To'] = you

# For Gmail, use 'smtp.gmail.com' and port 587
smtp_server = "smtp.gmail.com"
port = 587

# Create a secure SSL context
context = ssl.create_default_context()

try:
    with smtplib.SMTP(smtp_server, port) as server:
        server.starttls(context=context)
        server.login(me, "temp")
        server.send_message(msg)
    print("Email sent successfully!")
except Exception as e:
    print(f"Error sending email: {e}")