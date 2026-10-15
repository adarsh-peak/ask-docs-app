"""Run the actual create endpoint with stdlib-only dependency stand-ins."""
import ast
from datetime import datetime
from pathlib import Path
import re
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code

class AtomicCreateTest(unittest.TestCase):
    def test_existing_and_concurrent_file_remain_intact(self):
        tree = ast.parse((Path(__file__).resolve().parents[1] / 'src/daemon.py').read_text())
        node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'create_doc')
        node.decorator_list = []
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            ns = dict(DOCS_ROOT=root, CreateDocRequest=SimpleNamespace, HTTPException=HTTPException, re=re, datetime=datetime)
            exec(compile(ast.Module(body=[node], type_ignores=[]), 'actual-create-doc', 'exec'), ns)
            req = SimpleNamespace(filename='same', folder='', tags=[])
            target = root / 'same.md'
            target.write_text('existing owner content')
            with self.assertRaises(HTTPException) as error:
                ns['create_doc'](req)
            self.assertEqual(error.exception.status_code, 409)
            self.assertEqual(target.read_text(), 'existing owner content')
            target.unlink()
            mkdir = Path.mkdir
            def race(path, *args, **kwargs):
                mkdir(path, *args, **kwargs)
                target.write_text('concurrent winner content')
            with patch.object(Path, 'mkdir', race):
                with self.assertRaises(HTTPException) as error:
                    ns['create_doc'](req)
            self.assertEqual(error.exception.status_code, 409)
            self.assertEqual(target.read_text(), 'concurrent winner content')
            target.unlink()
            result = ns['create_doc'](req)
            self.assertEqual(target.read_text(), result['content'])

if __name__ == '__main__':
    unittest.main()
