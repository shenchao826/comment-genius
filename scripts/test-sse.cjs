const body = JSON.stringify({
  query: "写一段小学三年级数学评语",
  productLine: "teachers",
  context: {
    studentInfo: { name: "张三", traits: ["认真", "细心"], commentType: "期末评语" }
  },
  stream: true
});

console.log("Testing SSE on PRODUCTION (with no-cache headers)...");
console.log("Time:", new Date().toISOString());
console.log("");

fetch("https://a806ddac.teachers-ess.pages.dev/api/rag/query", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Cache-Control": "no-cache" },
  body
}).then(async (res) => {
  console.log("Status:", res.status);
  console.log("Content-Type:", res.headers.get("content-type"));
  console.log("--- Streaming response ---\n");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventCount = 0;
  let fullText = "";
  let startTime = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const jsonStr = trimmed.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      eventCount++;
      try {
        const data = JSON.parse(jsonStr);
        if (data.error) {
          console.error("[ERROR]", data.error, data.detail || "");
        } else if (data.done) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`\n[DONE] ${elapsed}s | answer: ${(data.answer || "").length} chars | chunks: ${data.chunk_count} | events: ${eventCount}`);
        } else if (data.delta) {
          fullText = data.text || "";
          process.stdout.write(data.delta);
        }
      } catch (e) {}
    }
  }

  if (!fullText && eventCount === 0) {
    console.log("(No SSE events received - may still be cached old code)");
  }

  console.log("\n\n--- Final text (" + fullText.length + " chars) ---");
  console.log(fullText || "(empty)");
}).catch(err => {
  console.error("Fetch error:", err.message);
});