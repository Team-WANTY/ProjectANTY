from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

DEEPLINK_SCHEME = "anty://"
FALLBACK_URL = "https://google.com"  # Hardcoded fallback

redirect_router = APIRouter()

@redirect_router.get("/app", response_class=HTMLResponse, include_in_schema=False)
async def universal_redirect(
    page: str,
    token: str | None = None
):
    """
    Universal redirect service for deep links with built-in fallback.

    - page: screen or action name (password_reset, verify_email, invite, etc.)
    - token: optional JWT or unique link token
    """
    if not page:
        raise HTTPException(status_code=400, detail="Missing required 'page' parameter")

    # Build query string only if token is provided
    deeplink_url = f"{DEEPLINK_SCHEME}{page}"
    if token:
        deeplink_url += f"?{urlencode({'token': token})}"

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
        <p>You will be redirected shortly.</p>
        <p><a href="{FALLBACK_URL}">Click here if nothing happens</a></p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)
