class UserError(Exception):
    """Base class for user-related exceptions"""


class UserExistsError(UserError):
    """Creating an already existing user"""

    pass


class UserUsernameExistsError(UserExistsError):
    """Specific case of existing user where username is taken"""

    pass


class UserEmailExistsError(UserExistsError):
    """Specific case of existing user where email is taken"""

    pass


class UserCreationError(UserError):
    """General error during user creation"""

    pass


class UserInvalidCreationInputError(UserCreationError):
    pass


class UserNotFoundError(UserError):
    """User could not be found"""

    pass


class UserGeneralQueryError(UserError):
    """General error while locating user"""

    pass


class UserUpdateError(UserError):
    """General error while updating user"""

    pass


class UserUpdateInvalidEmailError(UserUpdateError):
    pass


class UserUpdateInvalidUsernameError(UserUpdateError):
    pass


class UserDeletionError(UserError):
    """General error while deleting user"""

    pass


class UserTokenError(UserError):
    pass


class UserInterserviceError(UserError):
    pass
