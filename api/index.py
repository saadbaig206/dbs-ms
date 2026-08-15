import os
import sys

# Prepend the 'api' directory to Python path to avoid naming conflicts with the root 'app' folder
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app
