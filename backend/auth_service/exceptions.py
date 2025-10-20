class AuthError(Exception):
    pass

class AuthIncorrectPasswordError(AuthError):
    pass
