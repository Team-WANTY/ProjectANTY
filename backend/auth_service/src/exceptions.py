from backend.shared.exceptions.auth import AuthError


class AuthIncorrectPasswordError(AuthError):
    pass
