from dataclasses import dataclass
from django.apps.registry import Apps


@dataclass
class ModelGetter:
    """Convenience wrapper class to invoke Apps.get_model("keystone", <model_name>)
    via attribute access."""

    apps: Apps

    def __getattr__(self, model_name):
        return self.apps.get_model("keystone", model_name)
