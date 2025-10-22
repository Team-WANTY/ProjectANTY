
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

DEEPLINK_SCHEME = "anty://"
FALLBACK_URL = "https://google.com"  # Hardcoded fallback

redirect_router = APIRouter()

@redirect_router.get("/go", response_class=HTMLResponse, include_in_schema=False)
async def universal_redirect(
    type: str,
    token: str
):
    """
    Universal redirect service for deep links with built-in fallback.

    - type: type of action (password_reset, verify_email, invite, etc.)
    - token: JWT or unique link token
    """
    if not type or not token:
        raise HTTPException(status_code=400, detail="Missing required parameters")

    # Build query string for deep link
    query_params = {"token": token}
    deeplink_url = f"{DEEPLINK_SCHEME}{type}?{urlencode(query_params)}"

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Redirecting...</title>
        <script>
            window.onload = function() {{
                // Attempt to open the app
                window.location.href = "{deeplink_url}";

                // If the app does not open within 5 seconds, redirect to built-in fallback
                setTimeout(function() {{
                    window.location.href = "{FALLBACK_URL}";
                }}, 5000);
            }};
        </script>
        <style>
            body {{
                font-family: system-ui, sans-serif;
                text-align: center;
                padding: 3rem;
                color: #333;
                background-color: #f9fafb;
            }}
            a {{ color: #2563eb; text-decoration: none; font-weight: bold; }}
        </style>
    </head>
    <body>
        <h2>Opening your app...</h2>
        <p>If it doesn’t open automatically, you will be redirected shortly.</p>
        <p><a href="{FALLBACK_URL}">Click here if nothing happens</a></p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
