import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

app = Celery("app")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "flag-overdue-tasks-daily": {
        "task": "students.tasks.flag_overdue_tasks",
        "schedule": crontab(hour=0, minute=5),
    },
    "send-deadline-reminders-daily": {
        "task": "students.tasks.send_deadline_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
}
