
package NetSenseAI;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/diagnostics")
public class DiagnosticController {

    private static final Path ENGINE_DIRECTORY = Path.of(
        "J:/AIORI-3/NetSense_AI/network_engine"
    );

    private final DiagnosticRepository diagnosticRepository;
    private final ObjectMapper objectMapper;

    public DiagnosticController(
        DiagnosticRepository diagnosticRepository,
        ObjectMapper objectMapper
    ) {
        this.diagnosticRepository = diagnosticRepository;
        this.objectMapper = objectMapper;
    }

    // Run network diagnostics and save the result in SQLite
    @GetMapping(
        value = "/run",
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<?> runDiagnostics() {

        try {
            ProcessBuilder builder = new ProcessBuilder(
                "py",
                "diagnostics.py",
                "--json"
            );

            builder.directory(ENGINE_DIRECTORY.toFile());

            Process process = builder.start();

            CompletableFuture<String> outputFuture =
                CompletableFuture.supplyAsync(
                    () -> readStream(process.getInputStream())
                );

            CompletableFuture<String> errorFuture =
                CompletableFuture.supplyAsync(
                    () -> readStream(process.getErrorStream())
                );

            boolean completed = process.waitFor(
                120, TimeUnit.SECONDS
            );

            if (!completed) {
                process.destroyForcibly();

                return ResponseEntity.internalServerError().body(
                    Map.of(
                        "status", "error",
                        "message", "Diagnostic process timed out."
                    )
                );
            }

            String output = outputFuture.get(
                10, TimeUnit.SECONDS
            );

            String errorOutput = errorFuture.get(
                10, TimeUnit.SECONDS
            );

            if (process.exitValue() != 0) {
                return ResponseEntity.internalServerError().body(
                    Map.of(
                        "status", "error",
                        "message", "Python diagnostic execution failed.",
                        "details", errorOutput
                    )
                );
            }

            if (output.isBlank()) {
                return ResponseEntity.internalServerError().body(
                    Map.of(
                        "status", "error",
                        "message", "Python returned an empty response."
                    )
                );
            }

            // Convert Python JSON into a Java Map
            Map<String, Object> report =
                objectMapper.readValue(output, Map.class);

            // Save diagnostic report in SQLite
            diagnosticRepository.saveDiagnostic(report);

            // Return diagnostic report to frontend
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(report);

        } catch (Exception error) {

            return ResponseEntity.internalServerError().body(
                Map.of(
                    "status", "error",
                    "message", String.valueOf(error.getMessage())
                )
            );
        }
    }

    // Retrieve previously saved diagnostic reports
    @GetMapping("/history")
    public ResponseEntity<?> getDiagnosticHistory() {

        try {
            return ResponseEntity.ok(
                diagnosticRepository.getAllDiagnostics()
            );

        } catch (Exception error) {

            return ResponseEntity.internalServerError().body(
                Map.of(
                    "status", "error",
                    "message", String.valueOf(error.getMessage())
                )
            );
        }
    }

    // Read process output safely
    private String readStream(InputStream stream) {

        try {
            return new String(
                stream.readAllBytes(),
                StandardCharsets.UTF_8
            ).trim();

        } catch (IOException error) {
            throw new RuntimeException(error);
        }
    }
}
