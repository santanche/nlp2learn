FROM continuumio/miniconda3

WORKDIR /home/jovyan/work

COPY environment.yml /tmp/environment.yml
RUN conda env create -f /tmp/environment.yml \
    && conda clean -afy

EXPOSE 8888

ENTRYPOINT ["conda", "run", "--no-capture-output", "-n", "nlp2learn", \
            "jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]
