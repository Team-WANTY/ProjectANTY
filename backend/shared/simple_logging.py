import inspect
import sys
from datetime import datetime

from settings import settings

LEVELS = {
    "DEBUG": 10,
    "INFO": 20,
    "WARN": 30,
    "ERROR": 40,
    "CRIT": 50,
    "NONE": 100,  # disables all logging
}

COLORS = {
    "DEBUG": "\033[33m",  # yellow
    "INFO": "\033[37m",  # white
    "WARN": "\033[38;5;208m",  # orange
    "ERROR": "\033[31m",  # red
    "CRIT": "\033[38;5;124m",  # deep red
    "RESET": "\033[0m",
}


class SimpleLogger:
    def __init__(self):
        current = settings.MINIMUM_LOGGING_LEVEL
        self.min_level = LEVELS.get(current.upper(), 20)

    def _should_log(self, level: str) -> bool:
        return LEVELS[level] >= self.min_level

    def _log(self, level, msg):
        ts = datetime.now().isoformat()
        frame = inspect.stack()[2]
        filepath = frame.filename
        func = frame.function
        line = frame.lineno

        color = COLORS[level]
        reset = COLORS["RESET"]

        print(
            f"{color}{ts} | {level} | {filepath} @ {func} @ #{line} | {msg}{reset}",
            file=sys.stdout,
        )

    def debug(self, msg):
        if self._should_log("DEBUG"):
            self._log("DEBUG", msg)

    def info(self, msg):
        if self._should_log("INFO"):
            self._log("INFO", msg)

    def warning(self, msg):
        if self._should_log("WARN"):
            self._log("WARN", msg)

    def error(self, msg):
        if self._should_log("ERROR"):
            self._log("ERROR", msg)

    def critical(self, msg):
        if self._should_log("CRIT"):
            self._log("CRIT", msg)


logger = SimpleLogger()
