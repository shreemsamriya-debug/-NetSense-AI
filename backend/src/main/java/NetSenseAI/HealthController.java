
package NetSenseAI;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {

        return Map.of(
            "application", "NetSense AI",
            "status", "Running",
            "version", "1.0",
            "message", "Network diagnosis system is ready"
        );
    }
}
