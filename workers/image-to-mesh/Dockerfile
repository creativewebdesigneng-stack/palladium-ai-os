FROM python:3.12-slim

WORKDIR /app
COPY server.py run_triposr.py ./

# The slim image is the contract service. It stays ready only after TripoSR is
# mounted or THREE_D_HF_ENDPOINT_URL and HF_TOKEN are set. The GPU image in
# Dockerfile.gpu installs TripoSR itself.
ENV PYTHONUNBUFFERED=1
ENV MESH_BIND=0.0.0.0
ENV PORT=8080
EXPOSE 8080

CMD ["python", "server.py"]
