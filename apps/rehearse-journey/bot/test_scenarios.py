import unittest

from scenario import LEVELS, get_level, level_prompt


class HospitalLevelTests(unittest.TestCase):
    def test_all_five_levels_exist_with_expected_character_limits(self):
        self.assertEqual(set(LEVELS), {"1", "2", "3", "4", "5"})
        self.assertEqual(len(get_level("1").characters), 1)
        self.assertEqual(len(get_level("2").characters), 1)
        self.assertEqual(len(get_level("3").characters), 2)
        self.assertEqual(len(get_level("4").characters), 4)
        self.assertEqual(len(get_level("5").characters), 4)
        self.assertTrue(all(level.max_active_speakers == 1 for level in LEVELS.values()))

    def test_invalid_level_is_rejected(self):
        with self.assertRaises(ValueError):
            get_level("99")

    def test_level_prompt_preserves_safety_and_speaker_identity(self):
        prompt = level_prompt(get_level("5"))
        self.assertIn("fictional practice environment", prompt)
        self.assertIn("Only one simulated character", prompt)
        self.assertIn("controlled variable group", prompt)


if __name__ == "__main__":
    unittest.main()
