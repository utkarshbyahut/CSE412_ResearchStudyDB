require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// To read form POST body
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const defaultQuery = "SELECT * FROM study.participant LIMIT 10;";
  const html = renderPage(defaultQuery, null, null);
  res.send(html);
});

app.post("/query", async (req, res) => {
  const sql = req.body.sql || "";

  if (!sql.trim()) {
    const html = renderPage("", null, "Please enter a SQL query.");
    return res.send(html);
  }

  try {
    const result = await pool.query(sql);

    // If there are rows (SELECT), show them
    if (result.rows && result.rows.length > 0) {
      const columns = Object.keys(result.rows[0]);
      const tableHtml = `
        <table>
          <thead>
            <tr>
              ${columns.map((c) => `<th>${c}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${result.rows
              .map(
                (row) => `
              <tr>
                ${columns
                  .map((c) => {
                    let v = row[c];
                    if (v === null || v === undefined) v = "";
                    return `<td>${v}</td>`;
                  })
                  .join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      `;

      const html = renderPage(sql, {
        type: "table",
        html: tableHtml,
        info: `${result.rowCount} row(s) returned`,
      });
      res.send(html);
    } else {
      // No rows (e.g. INSERT/UPDATE/DELETE)
      const html = renderPage(sql, {
        type: "info",
        info: `${result.rowCount} row(s) affected.`,
      });
      res.send(html);
    }
  } catch (err) {
    console.error(err);
    const html = renderPage(sql, null, err.message);
    res.send(html);
  }
});

function renderPage(currentSql, resultBlock, errorMessage) {
  return `
  <html>
    <head>
      <title>Local SQL Console – study_db</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background:#020617; color:#e5e7eb; margin:0; padding:24px; }
        h1 { margin-bottom:4px; }
        p { margin-top:4px; margin-bottom:12px; color:#9ca3af; }
        form { margin-bottom:16px; }
        textarea {
          width:100%;
          max-width:1000px;
          height:140px;
          background:#020617;
          color:#e5e7eb;
          border-radius:12px;
          border:1px solid #1f2937;
          padding:10px 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size:13px;
          box-sizing:border-box;
        }
        button {
          margin-top:8px;
          padding:8px 16px;
          border-radius:999px;
          border:none;
          background:#0ea5e9;
          color:white;
          font-size:14px;
          font-weight:500;
          cursor:pointer;
        }
        button:hover { background:#38bdf8; }
        .info { margin:8px 0 12px; color:#a5b4fc; font-size:13px; }
        .error { margin:8px 0 12px; color:#fca5a5; font-size:13px; white-space:pre-wrap; }
        table { border-collapse: collapse; width:100%; max-width:1000px; margin-top:8px; background:#020617; }
        th, td { border:1px solid #1f2937; padding:6px 8px; font-size:13px; text-align:left; }
        th { background:#0f172a; }
        tr:nth-child(even) { background:#020617; }
        code { background:#0b1120; padding:2px 4px; border-radius:4px; }
      </style>
    </head>
    <body>
      <h1>Local SQL Console</h1>
      <p>DB: <code>study_db</code> on <code>localhost:5432</code> – schema <code>study</code></p>
      
      <form method="POST" action="/query">
        <label for="sql">SQL query</label><br/>
        <textarea id="sql" name="sql" spellcheck="false">${currentSql || ""}</textarea><br/>
        <button type="submit">Run</button>
      </form>

      ${
        errorMessage
          ? `<div class="error">Error: ${errorMessage}</div>`
          : ""
      }

      ${
        resultBlock
          ? `<div class="info">${resultBlock.info || ""}</div>${
              resultBlock.type === "table" ? resultBlock.html : ""
            }`
          : ""
      }
    </body>
  </html>
  `;
}

const port = 3000;
app.listen(port, () => {
  console.log(`SQL console running at http://localhost:${port}`);
});
