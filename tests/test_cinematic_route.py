"""Execute production route definitions without importing the agent's AWS runtime.

Only registration and FileResponse are stand-ins; route bodies and their order are
compiled unchanged from agent.py. No pytest or backend dependencies required.
"""
import ast
from pathlib import Path
import unittest
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]


class CinematicRouteTest(unittest.TestCase):
    def test_cinematic_precedes_fallback_and_serves_html_file(self):
        tree = ast.parse((ROOT / 'src/agent.py').read_text())
        routes = []

        class App:
            def get(self, path, **kwargs):
                def register(fn):
                    routes.append((path, fn))
                    return fn
                return register

        namespace = {
            'app': App(), 'STATIC_DIR': ROOT / 'frontend/public',
            'FileResponse': lambda path, **kwargs: SimpleNamespace(path=path, **kwargs),
        }
        # Keep the actual decorated endpoint functions in production declaration order.
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and any(isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                         and isinstance(d.func.value, ast.Name) and d.func.value.id == 'app'
                         and d.args and isinstance(d.args[0], ast.Constant)
                         and d.args[0].value in ('/ask-docs-demo.html', '/{full_path:path}')
                         for d in node.decorator_list)]
        exec(compile(ast.Module(body=nodes, type_ignores=[]), 'agent-routes', 'exec'), namespace)
        self.assertEqual([path for path, _ in routes], ['/ask-docs-demo.html', '/{full_path:path}'])
        endpoint = next(fn for path, fn in routes if path in ('/ask-docs-demo.html', '/{full_path:path}'))
        response = endpoint()
        self.assertEqual(response.path, ROOT / 'frontend/public/ask-docs-demo.html')
        self.assertEqual(response.media_type, 'text/html')
        self.assertTrue(response.path.is_file())
        self.assertIn('window.FILM', response.path.read_text())


if __name__ == '__main__':
    unittest.main()
