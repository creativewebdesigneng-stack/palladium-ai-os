FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
COPY workers/gta-obj-inspector/server.py /app/server.py
RUN useradd --system --uid 10001 inspector
USER inspector
EXPOSE 8080
CMD ["python", "/app/server.py"]
