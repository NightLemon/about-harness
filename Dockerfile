FROM python:3.12-slim@sha256:2c941e860699f878900b0edc2403613c234d4b32eda3cc9fa7036991a2a63c4a

ARG SOURCE_DATE_EPOCH=0
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace/lab/src

WORKDIR /workspace
RUN useradd --create-home --uid 10001 harness

COPY --chown=harness:harness lab/src/ lab/src/
COPY --chown=harness:harness lab/schemas/ lab/schemas/
COPY --chown=harness:harness lab/fixtures/ lab/fixtures/
COPY --chown=harness:harness scripts/lab-smoke.py scripts/lab-smoke.py
COPY --chown=harness:harness scripts/run-labs.py scripts/run-labs.py

USER harness
CMD ["python", "scripts/lab-smoke.py"]
