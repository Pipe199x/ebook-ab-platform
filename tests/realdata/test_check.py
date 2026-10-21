"""Small self-check for the Gutenberg RDF parser (no network, no data files).

Run: uv run python -m unittest tests.realdata.test_check
"""

import unittest
import xml.etree.ElementTree as ET

from ebook_ab.realdata.check import parse_rdf_record

RECORD = b"""<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xml:base="http://www.gutenberg.org/"
  xmlns:pgterms="http://www.gutenberg.org/2009/pgterms/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <pgterms:ebook rdf:about="ebooks/10007">
    <pgterms:downloads rdf:datatype="http://www.w3.org/2001/XMLSchema#integer">15403</pgterms:downloads>
    <dcterms:title>Carmilla</dcterms:title>
    <dcterms:language><rdf:Description><rdf:value>en</rdf:value></rdf:Description></dcterms:language>
  </pgterms:ebook>
</rdf:RDF>
"""


class ParseRdfRecordTest(unittest.TestCase):
    def test_fields(self):
        rec = parse_rdf_record(RECORD)
        self.assertEqual(rec["id"], "10007")
        self.assertEqual(rec["title"], "Carmilla")
        self.assertEqual(rec["downloads"], 15403)
        self.assertEqual(rec["language"], "en")

    def test_missing_downloads_is_zero(self):
        xml = RECORD.replace(b"<pgterms:downloads", b"<pgterms:unused").replace(
            b"</pgterms:downloads>", b"</pgterms:unused>"
        )
        self.assertEqual(parse_rdf_record(xml)["downloads"], 0)

    def test_missing_ebook_raises(self):
        with self.assertRaises(ValueError):
            parse_rdf_record(b"<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'/>")


if __name__ == "__main__":
    unittest.main()
