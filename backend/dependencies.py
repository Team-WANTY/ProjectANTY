from service.db.init import users_container
from service.db.user import UsersDB
from service.services.auth import AuthService
from service.services.user import UsersService

users_db = UsersDB(users_container)


def get_users_service():
    return UsersService(users_db)


