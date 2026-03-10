import { useState } from "react";
import "./App.css";

const PROXY_URL = "";

function App() {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [requestBody, setRequestBody] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");

  // Auth
  const [authEnabled, setAuthEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");

  // Response
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchToken = async () => {
    setTokenError("");
    try {
      const res = await fetch(`${PROXY_URL}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenUrl, clientId, clientSecret }),
      });
      const data = await res.json();
      if (data.access_token) {
        setToken(data.access_token);
        return data.access_token;
      } else {
        setTokenError(JSON.stringify(data, null, 2));
        return null;
      }
    } catch (e) {
      setTokenError(e.message);
      return null;
    }
  };

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const headers = {};

      // Parse custom headers
      if (customHeaders.trim()) {
        for (const line of customHeaders.split("\n")) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
      }

      // Handle auth
      if (authEnabled) {
        let accessToken = token;
        if (!accessToken && tokenUrl && clientId && clientSecret) {
          accessToken = await fetchToken();
        }
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
      }

      const res = await fetch(`${PROXY_URL}/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          headers,
          body: requestBody || undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return "#4caf50";
    if (status >= 300 && status < 400) return "#ff9800";
    if (status >= 400 && status < 500) return "#f44336";
    return "#9c27b0";
  };

  return (
    <div className="app">
      <h1>API Test Console</h1>

      <div className="request-section">
        <div className="url-row">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g. https://api.example.com/endpoint)"
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          />
          <button onClick={sendRequest} disabled={loading || !url}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        <div className="tabs-section">
          <details>
            <summary>Headers</summary>
            <textarea
              value={customHeaders}
              onChange={(e) => setCustomHeaders(e.target.value)}
              placeholder={"Content-Type: application/json\nX-Custom: value"}
              rows={3}
            />
          </details>

          {(method !== "GET" && method !== "HEAD") && (
            <details>
              <summary>Body</summary>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={5}
              />
            </details>
          )}

          <details open={authEnabled}>
            <summary>
              <label className="auth-toggle">
                <input
                  type="checkbox"
                  checked={authEnabled}
                  onChange={(e) => setAuthEnabled(e.target.checked)}
                />
                OAuth2 Client Credentials
              </label>
            </summary>
            {authEnabled && (
              <div className="auth-section">
                <input
                  type="text"
                  value={tokenUrl}
                  onChange={(e) => setTokenUrl(e.target.value)}
                  placeholder="Token URL"
                />
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client ID"
                />
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Client Secret"
                />
                <div className="token-row">
                  <button onClick={fetchToken} className="token-btn">
                    Get Token
                  </button>
                  {token && (
                    <span className="token-preview">
                      Token: {token.slice(0, 20)}...
                    </span>
                  )}
                </div>
                {tokenError && (
                  <pre className="error-block">{tokenError}</pre>
                )}
              </div>
            )}
          </details>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {response && (
        <div className="response-section">
          <div className="status-bar">
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(response.status) }}
            >
              {response.status} {response.statusText}
            </span>
          </div>

          <div className="response-panels">
            <div className="panel">
              <h3>Request Headers</h3>
              <pre>
                {Object.entries(response.requestHeaders).length > 0
                  ? Object.entries(response.requestHeaders)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n")
                  : "(none)"}
              </pre>
            </div>

            <div className="panel">
              <h3>Response Headers</h3>
              <pre>
                {Object.entries(response.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
              </pre>
            </div>

            <div className="panel full-width">
              <h3>Response Body</h3>
              <pre>
                {typeof response.body === "object"
                  ? JSON.stringify(response.body, null, 2)
                  : response.body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
