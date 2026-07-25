import os


def get_user_media_path_prefix(instance, filename):
    return os.path.join("users", str(instance.uid), filename)
