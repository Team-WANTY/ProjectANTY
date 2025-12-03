class DBError(Exception):
    pass


class RecordCreationError(DBError):
    pass


class RecordAlreadyExistsError(RecordCreationError):
    pass


class RecordNotFoundError(RecordCreationError):
    pass


class RecordUpdateError(DBError):
    pass


class EmptyRecordUpdateError(RecordUpdateError):
    pass


class RecordDeletionError(DBError):
    pass


class GeneralQueryError(DBError):
    pass
