class AuthError(Exception):
    pass


class AuthIncorrectPasswordError(AuthError):
    pass


class AuthDBError(Exception):
    pass


class AuthExistsError(AuthDBError):
    pass


class AuthCreationError(AuthDBError):
    pass

class AuthCreationInvalidPasswordError(AuthCreationError):
    pass

class AuthNotFoundError(AuthDBError):
    pass


class AuthGeneralQueryError(AuthDBError):
    pass


class AuthUpdateInvalidPasswordError(AuthDBError):
    pass


class AuthUpdateError(AuthDBError):
    pass


class AuthDeletionError(AuthDBError):
    pass
