import { SignJWT } from "jose";

async function testFinalizeDirect() {
  const secret = new TextEncoder().encode("super-secret-jwt-key-456");
  const token = await new SignJWT({ id: "1", username: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret);

  const payload = {
    fileName: "doc-1.pdf",
    version: `v${Date.now()}`,
    fileId: "test-file-id-12345",
    uploadId: "test-upload-id-12345",
    chunkMethod: "adaptive",
    engineMode: "hybrid",
    embeddingModel: "text-embedding-3-small",
    chunks: [
      {
        index: 0,
        content: "Test chunk content for doc-1.pdf",
        section: "📄 Overview",
        tags: ["large", "test"],
        topic: "Legal Regulatory",
        tier: "large",
        parentId: null,
      },
    ],
  };

  console.log("Sending POST http://127.0.0.1:8787/data/save-file-chunks...");

  const res = await fetch("http://127.0.0.1:8787/data/save-file-chunks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("Response Body:", JSON.stringify(data, null, 2));
}

testFinalizeDirect().catch(console.error);
