"""A escala ordinal não aceita bool como atalho para 0/1."""
import unittest
from scripts.build_game_data import EIXOS_CHAVES, vetor_de


class GameVectorTypesTests(unittest.TestCase):
    def test_boolean_is_rejected_in_each_axis(self):
        for eixo in EIXOS_CHAVES:
            for booleano in (False, True):
                with self.subTest(eixo=eixo, booleano=booleano):
                    row = dict.fromkeys(EIXOS_CHAVES, 0)
                    row[eixo] = booleano
                    self.assertIsNone(vetor_de(row))

    def test_real_zero_and_integer_observations_remain_valid(self):
        for valor in range(4):
            row = dict.fromkeys(EIXOS_CHAVES, valor)
            self.assertEqual(vetor_de(row), row)
