"""Core voice agent: wires STT -> LLM -> TTS over a Twilio call using Pipecat.

On call end, the full transcript is run through structured extraction and
the resulting lead is pushed to the CRM.
"""
import logging

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import EndFrame, LLMMessagesFrame, TranscriptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.services.whisper.stt import WhisperSTTService
from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

from app import config
from app.crm import push_lead
from app.extraction import extract_lead
from app.llm_factory import build_llm_service
from app.tts_factory import build_tts_service

logger = logging.getLogger("agent")


async def run_voice_agent(websocket, stream_sid: str, call_sid: str):
    """Run one phone call to completion."""
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_analyzer=SileroVADAnalyzer(),
            serializer=TwilioFrameSerializer(stream_sid),
        ),
    )

    stt = WhisperSTTService(model=config.WHISPER_MODEL)
    llm = build_llm_service()
    tts = build_tts_service()

    messages = [{"role": "system", "content": config.SYSTEM_PROMPT}]
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # Accumulate the transcript for end-of-call extraction.
    transcript_lines: list[str] = []

    @transport.event_handler("on_client_connected")
    async def on_connected(_transport, _client):
        # Kick off the call with a greeting.
        messages.append({
            "role": "system",
            "content": "Greet the caller now: say you're the Fiji IT Solutions "
                       "virtual receptionist and ask how you can help.",
        })
        await task.queue_frames([LLMMessagesFrame(messages)])

    pipeline = Pipeline([
        transport.input(),
        stt,
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    # Capture transcription frames as they flow past.
    @task.event_handler("on_frame_reached_downstream")
    async def capture(_task, frame):
        if isinstance(frame, TranscriptionFrame) and frame.text:
            transcript_lines.append(f"Caller: {frame.text}")

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)

    # ── Call has ended: extract + push ──
    transcript = "\n".join(transcript_lines)
    # Include assistant turns from the context for a fuller transcript.
    for m in messages:
        if m["role"] == "assistant":
            transcript += f"\nReceptionist: {m['content']}"

    logger.info("Call %s ended. Extracting lead...", call_sid)
    lead = await extract_lead(transcript)
    await push_lead(lead)
    return lead
