import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function Chat() {
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const chatWindowRef = useRef(null);

  // auto-scroll when new messages arrive
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!input) return;

    const question = input;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: question }]);

    const formData = new FormData();
    formData.append("question", question);

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    setMessages((prev) => [...prev, { role: "bot", content: data.answer }]);
  };

  // Upload PDFs
  const handleUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percent);
        },
      });

      alert("📚 PDFs uploaded successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Small Header with logo */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid #eee",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
      </div>

      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        style={{
          flex: 1,
          overflowY: "auto",
          margin: "20px 20% 140px 20%", // ✅ 20% margin left/right
          padding: "20px",
          backgroundColor: "#fafafa",
          borderRadius: "8px",
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
                padding: "12px 16px",
                borderRadius: "18px",
                maxWidth: "70%",
                backgroundColor: msg.role === "user" ? "#007bff" : "#e5e5ea",
                color: msg.role === "user" ? "#fff" : "#000",
                fontSize: "15px",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Input Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "20%",
          right: "20%",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        {/* Upload button */}
        <label
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            border: "1px solid #ccc",
            backgroundColor: "#f9f9f9",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "14px",
            flexShrink: 0,
            width: "100px",
            textAlign: "center",
          }}
        >
          📂 Upload
          <input
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
          />
        </label>

        {/* Textbox */}
        <input
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: "20px",
            border: "1px solid #ccc",
            fontSize: "15px",
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          style={{
            padding: "12px 20px",
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

      {/* Progress bar */}
      {uploading && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "20%",
            right: "20%",
            background: "#eee",
            borderRadius: "5px",
            height: "8px",
          }}
        >
          <div
            style={{
              width: `${uploadProgress}%`,
              background: "#28a745",
              height: "100%",
              borderRadius: "5px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Chat;
