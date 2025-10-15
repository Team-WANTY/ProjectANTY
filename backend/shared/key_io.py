import os


def find_key(key_name: str):
    key = None
    with open(key_name + ".pem", "rb") as pemf:
        key = pemf.read().decode(encoding="utf-8")
    if not key:
        raise FileNotFoundError(
            f"ERROR: {key_name}.pem does not exist or could not be read"
        )
    return key


def set_key_to_environment(key_name: str, key: str):
    # write to environment labels
    os.environ[key_name.upper()] = key

    # write to .env file
    lines = []
    updated = False
    with open(".env") as envf:
        for line in envf:
            if line.strip().startswith(f"{key_name.upper()}="):
                lines.append(f"{key_name.upper()}='{key}'\n")
                updated = True
            else:
                lines.append(line)

    if not updated:
        if not lines[-1].endswith("\n"):
            lines[-1] += "\n"
        lines.append(f"{key_name.upper()}='{key}'\n")

    with open(".env", "w") as file:
        file.writelines(lines)
