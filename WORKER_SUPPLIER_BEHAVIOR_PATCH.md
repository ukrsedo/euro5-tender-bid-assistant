# Buyer supplier behavior: Worker implementation

The branch's `worker.js` is the complete updated Worker source. This repository file is provided for review and controlled deployment; it has not been deployed by this change.

## API response change

`POST /buyer-history` now returns `supplier_behavior` with supplier name and EDRPOU, number of tenders with a confirmed bid, wins, median bid as a percentage of expected lot value, observed pricing pattern, and a participation outlook based on repeat appearances and recency.

The evidence is collected only when the tender identity and buyer match, and the tender's current `dateModified` is no later than the historical cutoff. Existing cache keys are versioned so old records without bid evidence are not reused.

## Interpretation

- Pricing behavior needs at least three usable bid-to-expected-value observations. Otherwise the UI reports insufficient price observations.
- Participation outlook is a rule-based summary of observed frequency and recency. It is not a trained probability or a promise that a supplier will submit a bid.
- Current Prozorro API snapshots that changed after the cutoff are excluded. Those records are not reconstructed from later data.
- The Worker does not yet extract the contents of tender PDF/DOCX files. The tender-check request currently supplies document links and metadata to the AI, not their text.
