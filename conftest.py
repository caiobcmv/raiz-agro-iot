# pytest root configuration
import os, sys
# Add iot-backend/src to sys.path so that imports like 'src' work
backend_src = os.path.abspath(os.path.join(os.path.dirname(__file__), 'iot-backend', 'src'))
if backend_src not in sys.path:
    sys.path.insert(0, backend_src)
# Ensure environment variables for tests
os.environ.setdefault('GEMINI_API_KEY', 'DEMO')
