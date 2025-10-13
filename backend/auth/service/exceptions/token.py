class JWTTokenError(Exception):
    pass


class JWTTokenExpiredError(JWTTokenError):
    pass
