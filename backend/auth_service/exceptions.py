class AuthError(Exception):
    pass

class AuthIncorrectPasswordError(AuthError):
    pass

class AuthDBError(Exception):
    pass

class UserNotFoundError(AuthDBError):
    pass

class AuthUpdateError(AuthDBError):
    pass

class AuthUpdateInvalidPasswordError(AuthUpdateError):
    pass

class TokenError(Exception):
    pass

class TokenExpiredError(TokenError):
    pass

class AuthInterserviceError(AuthError):
    pass
