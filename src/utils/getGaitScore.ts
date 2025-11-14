export async function getGaitScoreFromModel(metrics: any) {
  try {
    const response = await fetch("https://khushal-grover2005-gait-ml.hf.space/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // your model likely expects "data": [...input features...]
      body: JSON.stringify({
        data: [metrics], // change this to match your model’s input format
      }),
    });

    if (!response.ok) throw new Error("Model request failed");

    const result = await response.json();

    // Adjust this depending on your model's return format
    // Example if result = { data: [79] }
    const score = result.data?.[0] ?? result.score ?? 0;

    return score;
  } catch (err) {
    console.error("Error fetching gait score:", err);
    return 0;
  }
}
