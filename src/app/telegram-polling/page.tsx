"use client";

import { useEffect, useState } from 'react';

export default function TelegramPolling() {
  const [status, setStatus] = useState<string>('Idle');
  const [isPolling, setIsPolling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 50)]);
  };

  useEffect(() => {
    if (!isPolling) return;

    let isMounted = true;
    const poll = async () => {
      while (isMounted && isPolling) {
        try {
          setStatus('Polling...');
          const response = await fetch('/api/telegram/poll');
          const data = await response.json();
          
          if (data.ok && data.processed > 0) {
            addLog(`✅ Processed ${data.processed} update(s)`);
            setStatus('Active');
          } else {
            setStatus('Waiting...');
          }
          
          // Wait 2 seconds before next poll
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
          setStatus('Error');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };

    poll();
    return () => { isMounted = false; };
  }, [isPolling]);

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            📱 Telegram Button Polling
          </h1>
          <p className="text-white/60 mb-6">
            Keep this page open to enable Telegram button functionality without webhook setup.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setIsPolling(!isPolling)}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                isPolling
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }`}
            >
              {isPolling ? '⏸ Stop Polling' : '▶ Start Polling'}
            </button>
            
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${
                isPolling ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
              }`} />
              <span className="text-white/80">{status}</span>
            </div>
          </div>

          <div className="rounded-xl bg-black/30 p-4 h-[400px] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-white/40 italic">
                Waiting for activity... Click "Start Polling" to begin.
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-white/70 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-cyan-300 text-sm">
              💡 <strong>Tip:</strong> Keep this page open in a browser tab. When you click buttons in Telegram,
              they'll be processed automatically every 2 seconds.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white mb-3">
            How it works
          </h2>
          <ul className="space-y-2 text-white/60 text-sm">
            <li>✓ No ngrok or webhook setup needed</li>
            <li>✓ Polls Telegram API every 2 seconds for button clicks</li>
            <li>✓ Automatically processes approvals, details, etc.</li>
            <li>✓ Works perfectly for hackathon demos</li>
            <li>⚠️ Keep this page open while testing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
