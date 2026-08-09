FROM python:3.11-slim

WORKDIR /home/jovyan/work

# build-essential + cmake are needed to compile nmslib, a scispaCy dependency
# used for UMLS entity linking. It doesn't always ship prebuilt wheels for
# every platform/Python combination.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        git \
    && rm -rf /var/lib/apt/lists/*

COPY env/kg-extraction/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

EXPOSE 8888

ENTRYPOINT ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]
