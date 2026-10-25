"""Reproduce the approved Brazilian thesis slice from source metadata."""
import unittest

from scripts.build_data import build_stats


class BuildDataStatsTests(unittest.TestCase):
    def test_brazilian_thesis_slice_uses_numeric_year_and_inclusive_limits(self):
        corpus = [
            {"country": "Brazil", "year": 1822, "date": "1821"},
            {"country": "brasil", "year": 1922, "date": "1923"},
            {"country": "Brazil", "year": 1850, "date": "século XIX"},
            {"country": "Brazil", "year": 1821, "date": "1822"},
            {"country": "Brazil", "year": 1923, "date": "1922"},
            {"country": "Brazil", "date": "c. 1840 / 1923"},
            {"country": "Brazil", "date": "1810 / 1900"},
            {"country": "Brazil", "year": None, "date": "1890"},
            {"country": "France", "year": 1850},
            {"country": "Brazil", "date": "século XIX"},
            {"country": "Brazil"},
        ]

        stats = build_stats(corpus)

        self.assertEqual(stats["recorte_tese_brasil_1822_1922"], 5)
        # The full corpus period still observes every numeric date token.
        self.assertEqual(stats["periodo"], {"min": 1810, "max": 1923})


if __name__ == "__main__":
    unittest.main()
