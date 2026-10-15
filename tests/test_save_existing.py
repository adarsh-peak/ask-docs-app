"""Exercise actual save/delete endpoint bodies with real temporary files and stdlib."""
import ast
import builtins
from datetime import datetime
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


class HTTPException(Exception):
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code


class SaveExistingTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        tree = ast.parse((Path(__file__).resolve().parents[1] / 'src/daemon.py').read_text())
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and node.name in ('save_doc_content', 'delete_doc')]
        for node in nodes:
            node.decorator_list = []
        ns = dict(DOCS_ROOT=self.root, SaveDocRequest=SimpleNamespace,
                  HTTPException=HTTPException, datetime=datetime, os=os,
                  Query=lambda *a, **kw: None, app=SimpleNamespace(state=SimpleNamespace(es=None)),
                  delete_by_path=lambda *a: None)
        exec(compile(ast.Module(body=nodes, type_ignores=[]), 'actual-doc-endpoints', 'exec'), ns)
        self.save = ns['save_doc_content']
        self.delete = ns['delete_doc']

    def test_missing_file_returns_404_without_creating_file_or_parent(self):
        for path in ('missing.md', 'missing-folder/draft.md'):
            with self.subTest(path=path):
                with self.assertRaises(HTTPException) as error:
                    self.save(SimpleNamespace(path=path, content='stale draft'))
                self.assertEqual(error.exception.status_code, 404)
                self.assertFalse((self.root / path).exists())
        self.assertFalse((self.root / 'missing-folder').exists())

    def test_unlink_after_open_does_not_recreate_path(self):
        target = self.root / 'race.md'
        target.write_text('existing document')
        opened = []
        real_open = builtins.open

        def unlink_after_open(path, mode, **kwargs):
            fh = real_open(path, mode, **kwargs)
            opened.append(mode)
            target.unlink()
            return fh

        with patch('builtins.open', side_effect=unlink_after_open):
            result = self.save(SimpleNamespace(path='race.md', content='late save'))
        self.assertEqual(opened, ['r+'])
        self.assertFalse(target.exists())
        self.assertEqual(result['path'], 'race.md')
        datetime.fromisoformat(result['updated_at'])

    def test_existing_save_truncates_and_returns_timestamps(self):
        target = self.root / 'existing.md'
        target.write_text('a much longer original document', encoding='utf-8')
        result = self.save(SimpleNamespace(path='existing.md', content='short ✓'))
        self.assertEqual(target.read_text(encoding='utf-8'), 'short ✓')
        self.assertEqual(result['path'], 'existing.md')
        for field in ('created_at', 'updated_at'):
            datetime.fromisoformat(result[field])
        self.assertEqual(result['updated_at'], datetime.fromtimestamp(target.stat().st_mtime).isoformat())

    def test_successful_delete_then_stale_viewer_save_returns_404(self):
        target = self.root / 'deleted.md'
        target.write_text('original')
        self.assertEqual(self.delete('deleted.md'), {'deleted': 'deleted.md'})
        with self.assertRaises(HTTPException) as error:
            self.save(SimpleNamespace(path='deleted.md', content='remounted stale draft'))
        self.assertEqual(error.exception.status_code, 404)
        self.assertFalse(target.exists())

    def test_validation_and_other_os_errors_are_preserved(self):
        for path in ('../outside.md', 'file.txt'):
            with self.subTest(path=path):
                with self.assertRaises(HTTPException) as error:
                    self.save(SimpleNamespace(path=path, content='invalid'))
                self.assertEqual(error.exception.status_code, 400)
        # Opening a directory as a markdown file must remain a 500 write error.
        (self.root / 'directory.md').mkdir()
        with self.assertRaises(HTTPException) as error:
            self.save(SimpleNamespace(path='directory.md', content='no'))
        self.assertEqual(error.exception.status_code, 500)
        self.assertIn('Could not write file', str(error.exception))


if __name__ == '__main__':
    unittest.main()
