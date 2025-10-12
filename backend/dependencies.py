from backend.db.init import users_container
from backend.db.user import UsersDB
from backend.services.user import UsersService
from backend.services.auth import AuthService

users_db = UsersDB(users_container)

def get_users_service():
    return UsersService(users_db)

def get_auth_service():
    return AuthService(users_db)
