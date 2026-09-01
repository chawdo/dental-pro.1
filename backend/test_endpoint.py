import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth.models import User
from citas.views import ChatCopilotoIAView

factory = RequestFactory()
request = factory.post('/api/ia/copiloto/', {"mensaje": "test"})

# We must set request.user or bypass IsAuthenticated
request.user = User(username='testuser')

view = ChatCopilotoIAView.as_view()

response = view(request)
print("Response status:", response.status_code)
print("Response data:", response.data)
