from __future__ import annotations
import os
import re
import sys
import json
import time
import uuid
import inspect
import queue
import nltk
import torch
import uvicorn
import asyncio
import aiohttp
import logging
import threading
import numpy as np
import multiprocessing
import stream2sentence
from datetime import datetime
from pydantic import BaseModel
from queue import Queue, Empty
from openai import AsyncOpenAI
from collections import defaultdict
from collections.abc import Awaitable
from threading import Thread, Event, Lock
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Callable, Optional, Dict, List, Union, Any, AsyncIterator, AsyncGenerator, Awaitable, Set, Tuple
from server.stt import AudioToTextRecorder
from server.stream2sentence import generate_sentences_async
from server.tts.tts_generation import TTS, TTSSentence, AudioResponseDone, AudioChunk
from server.db import Character, Voice, RealtimeSync

logging.basicConfig(filename="filelogger.log", format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


########################################
##--             Models             --##
########################################

@dataclass
class CharacterResponse:
    conversation_id: str
    message_id: str
    character_id: str
    character_name: str
    voice_id: str
    text: str = ""

@dataclass
class ModelSettings:
    model: str
    temperature: float
    top_p: float
    min_p: float
    top_k: int
    frequency_penalty: float
    presence_penalty: float
    repetition_penalty: float


    async def stream_character_response(self,
                                        messages: List[Dict[str, str]],
                                        character: Character,
                                        message_id: str,
                                        model_settings: ModelSettings,
                                        on_text_chunk: Optional[Callable[[str, Character, str, str], Awaitable[None]]] = None) -> str:
        """Stream LLM tokens, split into sentences, push TTSSentence items to sentence_queue."""

        sentence_index = 0
        response = ""

        try:
            stream = await self.client.chat.completions.create(
                model=model_settings.model,
                messages=messages,
                temperature=model_settings.temperature,
                top_p=model_settings.top_p,
                frequency_penalty=model_settings.frequency_penalty,
                presence_penalty=model_settings.presence_penalty,
                stream=True,
                extra_body={
                    "top_k": model_settings.top_k,
                    "min_p": model_settings.min_p,
                    "repetition_penalty": model_settings.repetition_penalty,
                }
            )

            async def chunk_generator() -> AsyncGenerator[str, None]:
                nonlocal response
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta:
                        content = chunk.choices[0].delta.content
                        if content:
                            response += content
                            if on_text_chunk:
                                await on_text_chunk(content, character, message_id)
                            yield content

            async for sentence in generate_sentences_async(
                chunk_generator(),
                minimum_first_fragment_length=14,
                minimum_sentence_length=25,
                tokenizer="nltk",
                quick_yield_single_sentence_fragment=True,
                sentence_fragment_delimiters = ".?!;:,…)]}。-",
                full_sentence_delimiters = ".?!…。",
            ):
                sentence_text = sentence.strip()
                if sentence_text:
                    await self.queues.sentence_queue.put(TTSSentence(
                        text=sentence_text,
                        index=sentence_index,
                        message_id=message_id,
                        character_id=character.id,
                        character_name=character.name,
                        voice_id=character.voice_id,
                    ))
                    logger.info(f"[LLM] {character.name} sentence {sentence_index}: {sentence_text[:50]}...")
                    sentence_index += 1

        except Exception as e:
            logger.error(f"[LLM] Error streaming for {character.name}: {e}")

        finally:
            await self.queues.sentence_queue.put(AudioResponseDone(
                message_id=message_id,
                character_id=character.id,
                character_name=character.name,
            ))
            logger.info(f"[LLM] {character.name} complete: {sentence_index} sentences, sentinel enqueued")

        return response