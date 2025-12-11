import React, { useState, useEffect, useRef } from "react";
import { JoinRoom, SendChatMessage } from "../../wailsjs/go/backend/App";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: "chat" | "system";
}

interface DebugChatProps {}

const DebugChat: React.FC<DebugChatProps> = () => {
  const [roomName, setRoomName] = useState<string>("test-room");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("未接続");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (content: string, type: "chat" | "system" = "system", sender: string = "システム") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
      type,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  
  const handleJoinRoom = async () => {
    try {
      addMessage(`ルーム「${roomName}」に参加中...`, "system");
      const result = await JoinRoom(roomName);
      addMessage(result, "system");
      setIsConnected(true);
      setConnectionStatus("ルーム参加済み");
    } catch (error) {
      addMessage(`ルーム参加エラー: ${error}`, "system");
      setConnectionStatus("エラー");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    addMessage(inputMessage, "chat", "あなた");
    const messageToSend = inputMessage;
    setInputMessage("");

    try {
      const result = await SendChatMessage(messageToSend);
      addMessage(`送信結果: ${result}`, "system");
    } catch (error) {
      addMessage(`送信エラー: ${error}`, "system");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>WebRTC デバッグチャット</h2>
        <div style={styles.statusContainer}>
          <span style={styles.status}>状態: {connectionStatus}</span>
          <span style={{ ...styles.indicator, backgroundColor: isConnected ? "#4CAF50" : "#f44336" }}></span>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.roomControls}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="ルーム名"
            style={styles.input}
          />
          <button
            onClick={handleJoinRoom}
            disabled={isConnected}
            style={{ ...styles.button, backgroundColor: isConnected ? "#ccc" : "#4CAF50" }}
          >
            ルーム参加
          </button>
        </div>
      </div>

      <div style={styles.chatContainer}>
        <div style={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.message,
                ...(message.type === "chat" ? styles.chatMessage : styles.systemMessage)
              }}
            >
              <div style={styles.messageHeader}>
                <span style={styles.sender}>{message.sender}</span>
                <span style={styles.timestamp}>{formatTime(message.timestamp)}</span>
              </div>
              <div style={styles.messageContent}>{message.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "メッセージを入力..." : "先にルームに参加してください"}
            disabled={!isConnected}
            style={{
              ...styles.messageInput,
              backgroundColor: isConnected ? "#fff" : "#f5f5f5",
              cursor: isConnected ? "text" : "not-allowed"
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            style={{
              ...styles.sendButton,
              backgroundColor: (isConnected && inputMessage.trim()) ? "#2196F3" : "#ccc"
            }}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "800px",
    margin: "20px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f9f9f9",
  },
  header: {
    marginBottom: "20px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  status: {
    fontSize: "14px",
    color: "#666",
  },
  indicator: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  controls: {
    marginBottom: "20px",
  },
  roomControls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  input: {
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    flex: 1,
  },
  button: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.2s",
  },
  chatContainer: {
    border: "1px solid #ddd",
    borderRadius: "4px",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    height: "500px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  message: {
    padding: "8px 12px",
    borderRadius: "6px",
    maxWidth: "80%",
  },
  chatMessage: {
    backgroundColor: "#e3f2fd",
    alignSelf: "flex-start",
    border: "1px solid #bbdefb",
  },
  systemMessage: {
    backgroundColor: "#f5f5f5",
    alignSelf: "center",
    fontStyle: "italic",
    fontSize: "13px",
    border: "1px solid #e0e0e0",
  },
  messageHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    fontSize: "12px",
  },
  sender: {
    fontWeight: "bold",
    color: "#333",
  },
  timestamp: {
    color: "#666",
  },
  messageContent: {
    fontSize: "14px",
    lineHeight: "1.4",
  },
  inputContainer: {
    display: "flex",
    gap: "8px",
    padding: "10px",
    borderTop: "1px solid #ddd",
    backgroundColor: "#fafafa",
  },
  messageInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
  },
  sendButton: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background-color 0.2s",
  },
};

export default DebugChat;