import React, { useState } from "react";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState([]);
  const [files, setFiles] = useState(null);
  const [mode, setMode] = useState("🤖 Chat Mode");

  const handleSend = async () => {
    if (!input) return;
    setMessages([...messages, { role: "user", content: input }]);

    const formData = new FormData();
    formData.append("question", input);

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setMessages((prev) => [...prev, { role: "bot", content: data.answer }]);
    setSources(data.sources);

    if (data.sources && data.sources.length > 0) {
      setMode("📚 PDF Mode");
    } else {
      setMode("🤖 Chat Mode");
    }
    setInput("");
  };

  const handleUpload = async () => {
    if (!files) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    alert("📚 PDFs uploaded! Future questions will use them.");
    setMode("📚 PDF Mode");
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Mode indicator */}
      <div
        style={{
          marginBottom: "15px",
          padding: "8px 12px",
          borderRadius: "6px",
          background: "#f1f5f9",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        Current Mode: {mode}
      </div>

      {/* Chat box */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          height: "500px",
          overflowY: "auto",
          padding: "15px",
          backgroundColor: "#fafafa",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              margin: "10px 0",
            }}
          >
            <div
              style={{
                padding: "10px 15px",
                borderRadius: "18px",
                maxWidth: "70%",
                backgroundColor:
                  msg.role === "user" ? "#007bff" : "#e5e5ea",
                color: msg.role === "user" ? "#fff" : "#000",
                fontSize: "15px",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar (sticky at bottom) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          style={{
            padding: "10px 20px",
            borderRadius: "20px",
            border: "none",
            backgroundColor: "#007bff",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>

      {/* File upload section */}
      <div
        style={{
          marginTop: "20px",
          padding: "12px",
          border: "1px dashed #aaa",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <p style={{ marginBottom: "10px" }}>
          📂 Upload PDFs to switch to <b>PDF Mode</b>
        </p>
        <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
        <button
          onClick={handleUpload}
          style={{
            marginLeft: "10px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#28a745",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Upload
        </button>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#f9f9f9",
          }}
        >
          <b>Sources:</b>
          <ul>
            {sources.map((src, i) => (
              <li key={i}>{src}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Chat;
