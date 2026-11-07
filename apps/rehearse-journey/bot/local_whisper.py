"""Local Kenyan-English Whisper STT for Pipecat.

The model is a Transformers Whisper checkpoint, so it runs locally and does
not send microphone audio to a cloud STT provider. It is intentionally an
opt-in service because Whisper Large V3 needs substantial RAM/VRAM.
"""

import asyncio
import time
from typing import AsyncGenerator

import numpy as np


class KenyanWhisperSTT:
    """Factory for a Pipecat SegmentedSTTService backed by local Whisper."""

    @staticmethod
    def create(model_dir: str, sample_rate: int = 16000):
        from pipecat.frames.frames import TranscriptionFrame
        from pipecat.services.stt_service import SegmentedSTTService

        class LocalWhisperSTTService(SegmentedSTTService):
            @property
            def wants_wav_segments(self) -> bool:
                return False

            def __init__(self, **kwargs):
                super().__init__(sample_rate=sample_rate, **kwargs)
                # Lazy loading keeps bot startup usable when local STT is off.
                from transformers import WhisperForConditionalGeneration, WhisperProcessor

                import torch

                self._torch = torch
                self._processor = WhisperProcessor.from_pretrained(model_dir)
                self._model = WhisperForConditionalGeneration.from_pretrained(model_dir)
                self._device = "cuda" if torch.cuda.is_available() else "cpu"
                self._model.to(self._device)
                self._model.eval()

            async def run_stt(self, audio: bytes) -> AsyncGenerator[object, None]:
                text = await asyncio.to_thread(self._transcribe, audio)
                if text:
                    yield TranscriptionFrame(
                        text=text,
                        user_id=self._user_id,
                        timestamp=str(time.time()),
                        language="en",
                    )

            def _transcribe(self, audio: bytes) -> str:
                waveform = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
                inputs = self._processor(
                    waveform,
                    sampling_rate=sample_rate,
                    return_tensors="pt",
                )
                input_features = inputs.input_features.to(self._device)
                with self._torch.no_grad():
                    predicted_ids = self._model.generate(
                        input_features,
                        language="en",
                        task="transcribe",
                    )
                return self._processor.batch_decode(
                    predicted_ids,
                    skip_special_tokens=True,
                )[0].strip()

        return LocalWhisperSTTService
