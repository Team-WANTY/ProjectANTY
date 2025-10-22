import os


def set_key_to_environment(key_name: str, key: str):
    """Set an environment variable and persist it in a .env file."""

    # Write to environment
    os.environ[key_name.upper()] = key

    # Prepare lines to write
    lines = []
    updated = False

    try:
        with open(".env", "r") as envf:
            for line in envf:
                if line.strip().startswith(f"{key_name.upper()}="):
                    lines.append(f"{key_name.upper()}='{key}'\n")
                    updated = True
                else:
                    lines.append(line)
    except FileNotFoundError:
        # .env file doesn't exist, start with empty content
        lines = []

    if not updated:
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.append(f"{key_name.upper()}='{key}'\n")

    with open(".env", "w") as file:
        file.writelines(lines)
