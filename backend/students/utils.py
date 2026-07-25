import os


def get_student_media_path_prefix(instance, filename):
    return os.path.join("students", str(instance.uid), filename)
