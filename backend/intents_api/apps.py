from django.apps import AppConfig


class IntentsApiConfig(AppConfig):
    name = 'intents_api'

    def ready(self):
        import intents_api.signals
