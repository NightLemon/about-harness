FROM python:3.12-slim

ARG SOURCE_DATE_EPOCH=0
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace/lab/src

WORKDIR /workspace
RUN useradd --create-home --uid 10001 harness

COPY --chown=harness:harness lab/src/ lab/src/
COPY --chown=harness:harness lab/schemas/ lab/schemas/
COPY --chown=harness:harness scripts/lab-smoke.py scripts/lab-smoke.py

USER harness
CMD ["python", "scripts/lab-smoke.py"]
