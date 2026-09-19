# Regenerating the pack

The generator is dependency-free and requires Node.js 20 or newer. It recreates the entire versioned package deterministically, so edit the generator rather than hand-editing thousands of linked rows.

From the directory containing Drone_Data_Pack_v2.0.0:

```bash
node Drone_Data_Pack_v2.0.0/tools/generate-data.mjs
```

To write to a separate review directory:

```bash
DRONE_DATA_OUTPUT_DIR=/absolute/path/to/output node Drone_Data_Pack_v2.0.0/tools/generate-data.mjs
```

The target directory is replaced during regeneration. Commit or copy intentional manual edits first. After generation, confirm data-quality-report.json has passed = true and run sha256sum -c checksums.sha256 inside the output directory.
