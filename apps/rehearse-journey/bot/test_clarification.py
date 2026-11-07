import unittest

from clarification import ClarificationPractice, validate_settings


class ClarificationPracticeTests(unittest.TestCase):
    def test_settings_are_safe_and_invalid_percentages_fall_back(self):
        self.assertEqual(validate_settings(None), (False, 40))
        self.assertEqual(validate_settings({"enabled": True, "ambiguityPercentage": 40}), (True, 40))
        self.assertEqual(validate_settings({"enabled": True, "ambiguityPercentage": 99}), (True, 40))

    def test_disabled_mode_never_schedules_or_tracks(self):
        controller = ClarificationPractice()
        controller.configure({"enabled": False, "ambiguityPercentage": 60})
        self.assertIsNone(controller.next_instruction())
        self.assertEqual(controller.snapshot()["opportunities"], 0)

    def test_scheduler_approaches_target_without_consecutive_vague_turns(self):
        controller = ClarificationPractice()
        controller.configure({"enabled": True, "ambiguityPercentage": 40})
        vague = []
        for _ in range(20):
            instruction = controller.next_instruction()
            vague.append("vague_instruction" in instruction)
            if vague[-1]:
                controller.record_delivered()
                result = controller.handle_user_message("Which one exactly?")
                self.assertTrue(result["is_clarification"])
        self.assertGreaterEqual(sum(vague), 6)
        self.assertLessEqual(sum(vague), 10)
        self.assertFalse(any(vague[index] and vague[index + 1] for index in range(len(vague) - 1)))

    def test_natural_english_swahili_and_mixed_questions_resolve_pending_detail(self):
        for question in ("What do you mean by up?", "Unamaanisha nini?", "Hiyo table gani?"):
            controller = ClarificationPractice()
            controller.configure({"enabled": True, "ambiguityPercentage": 60})
            pending = None
            for _ in range(5):
                pending = controller.next_instruction()
                if "vague_instruction" in pending:
                    break
            self.assertIsNotNone(pending)
            result = controller.handle_user_message(question)
            self.assertTrue(result["is_clarification"])
            self.assertIsNotNone(result["specific_instruction"])
            self.assertIsNone(controller.pending)


if __name__ == "__main__":
    unittest.main()
