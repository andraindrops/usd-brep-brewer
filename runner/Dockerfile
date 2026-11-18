FROM python:3.12-slim

RUN pip install --no-cache-dir usd-brep==1.0.0 trimesh numpy

COPY export.py /opt/runner/export.py

WORKDIR /work
