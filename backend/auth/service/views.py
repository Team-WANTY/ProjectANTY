
from fastapi import FastAPI

from .models import User
from .service import authenticate_user, create_access_token, get_current_active_user

auth_router = FastAPI()

# Replace later with API endpoints
User()
authenticate_user()
create_access_token()
get_current_active_user()
