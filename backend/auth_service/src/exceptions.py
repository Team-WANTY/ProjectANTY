from shared.exceptions.auth import AuthError


class AuthIncorrectPasswordError(AuthError):
    pass


class AuthOldAndNewPasswordSameError(AuthError):
    pass
