# Stirling PDF engine slot

Build the MIT-licensed core flavor from `vendor/upstream/stirling-pdf-core` using `platform/windows/build-pdf-engine.ps1` or `platform/linux/build-pdf-engine.sh`. The resulting executable JAR is staged here as `stirling-pdf.jar`.

The runtime requires Java 25 or newer in the current upstream source. Do not place binaries built from separately licensed upstream directories in this slot. The local PDF service is bound to 127.0.0.1 by AIOF.
