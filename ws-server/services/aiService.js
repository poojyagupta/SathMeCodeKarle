const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function getAISuggestion(conflict) {
  console.log("🤖 AI SERVICE RECEIVED:", conflict.function);
  const versions = conflict.changes;

  const user1 = versions[0]?.body || "";
  const user2 = versions[1]?.body || "";

  const response = await fetch("http://localhost:5001/ai/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          filename: conflict.function,
          user1,
          user2,
        },
      ],
    }),
  });

  const data = await response.json();
  console.log("🤖 AI RAW RESPONSE:", JSON.stringify(data, null, 2));

  return data.result?.[0]?.merged_code || null;
}

module.exports = {
  getAISuggestion,
};
