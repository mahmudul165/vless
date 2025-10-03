export default function Home() {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <h1>Next.js V2Ray Collector</h1>
        <p>API routes:</p>
        <ul>
          <li><code>/api/scrape</code> - Trigger scraping</li>
          <li><code>/api/validate</code> - Validate links</li>
          <li><code>/api/servers?valid=1</code> - Get valid servers</li>
          <li><code>/api/cron</code> - Start cron scheduler</li>
        </ul>
      </div>
    );
  }
  