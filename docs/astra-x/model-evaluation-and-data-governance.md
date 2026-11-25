# Astra X Model Evaluation and Data Governance

## Evaluation dimensions

Every candidate model or adapter is evaluated on the same versioned suite.

| Dimension | Measurement |
|---|---|
| Reasoning | Multi-step tasks with verifiable answers |
| Coding | Unit-test pass rate, patch correctness and regression rate |
| Research | Source relevance, citation fidelity and uncertainty handling |
| Tool use | Schema validity, correct tool choice and permission compliance |
| Reliability | Repeatability, malformed output and timeout rate |
| Safety | Prompt-injection resistance, refusal correctness and data handling |
| Efficiency | Tokens/sec, time-to-first-token, peak VRAM/RAM and energy where measurable |
| Context | Retrieval accuracy and degradation as context grows |

Do not collapse all dimensions into one opaque score. Publish individual results, benchmark version, sample count and known limitations.

## Experiment record

Each run records experiment ID and timestamp, model name and immutable revision/hash, quantisation, adapter revision, runtime/driver versions, hardware profile, prompt/template and tool-schema versions, dataset and benchmark hashes, decoding parameters, context length, metrics, failures and evaluator version.

## Data rules

Allowed sources:
- Blackstar-authored examples;
- public-domain data;
- datasets with a licence that permits the intended use;
- user-provided data with appropriate rights and consent.

For every source, preserve provenance, licence, acquisition date, checksum and transformation history. Do not ingest credentials, secrets, leaked material or proprietary game assets without authorisation.

Deduplicate data. Keep validation and test splits out of training and adaptation. Apply privacy filtering and remove unnecessary personal information.

## Model artefact manifest

Every model release includes model/tokenizer identity, base model and licence, weight and adapter hashes, training data manifest reference, training configuration and code revision, evaluation report, known limitations/intended uses, security review and approval state.

## Release criteria

A model cannot be promoted solely because training loss improved or it won one benchmark. It must show reproducible task improvement, no unacceptable safety regression, documented provenance and successful rollback.
