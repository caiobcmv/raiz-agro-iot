import os, sys, pkgutil

# Path to the backend source where the real 'src' package lives
_backend_src = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'iot-backend', 'src'))
if _backend_src not in sys.path:
    sys.path.insert(0, _backend_src)
# Make submodules (api, tests, etc.) reachable
__path__ = [_backend_src] + __path__
