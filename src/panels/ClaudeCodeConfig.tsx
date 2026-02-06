import type { ClaudeCodeNodeData } from '../types';

interface Props {
  data: ClaudeCodeNodeData;
  onChange: (data: Partial<ClaudeCodeNodeData>) => void;
}

export function ClaudeCodeConfig({ data, onChange }: Props) {
  return (
    <>
      <label>
        Prompt
        <textarea
          value={data.prompt}
          onChange={e => onChange({ prompt: e.target.value })}
          placeholder="Enter prompt... Use {{input}} for upstream data"
        />
      </label>

      <label>
        Model
        <select value={data.model} onChange={e => onChange({ model: e.target.value as ClaudeCodeNodeData['model'] })}>
          <option value="sonnet">Sonnet</option>
          <option value="opus">Opus</option>
          <option value="haiku">Haiku</option>
        </select>
      </label>

      <label>
        Output Format
        <select value={data.outputFormat} onChange={e => onChange({ outputFormat: e.target.value as ClaudeCodeNodeData['outputFormat'] })}>
          <option value="json">JSON</option>
          <option value="stream-json">Stream JSON</option>
          <option value="text">Text</option>
        </select>
      </label>

      <label>
        Permission Mode
        <select value={data.permissionMode} onChange={e => onChange({ permissionMode: e.target.value as ClaudeCodeNodeData['permissionMode'] })}>
          <option value="default">Default</option>
          <option value="plan">Plan</option>
          <option value="bypassPermissions">Bypass Permissions</option>
        </select>
      </label>

      <label>
        Allowed Tools (comma-separated)
        <input
          value={data.allowedTools.join(', ')}
          onChange={e => onChange({ allowedTools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="Read, Bash, Write..."
        />
      </label>

      <label>
        System Prompt (appended)
        <textarea
          value={data.appendSystemPrompt}
          onChange={e => onChange({ appendSystemPrompt: e.target.value })}
          placeholder="Additional instructions..."
          style={{ minHeight: '80px' }}
        />
      </label>

      <label>
        Max Budget (USD)
        <input
          type="number"
          value={data.maxBudgetUsd}
          onChange={e => onChange({ maxBudgetUsd: parseFloat(e.target.value) || 0 })}
          min={0}
          step={0.1}
        />
      </label>

      <label>
        Working Directory
        <input
          value={data.workingDirectory}
          onChange={e => onChange({ workingDirectory: e.target.value })}
          placeholder="/path/to/project"
        />
      </label>

      <label>
        Timeout (ms, 0 = none)
        <input
          type="number"
          value={data.timeoutMs}
          onChange={e => onChange({ timeoutMs: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </label>

      <div className="toggle-row">
        <label style={{ flex: 1 }}>Continue Session</label>
        <button
          className={`toggle ${data.continueSession ? 'active' : ''}`}
          onClick={() => onChange({ continueSession: !data.continueSession })}
        />
      </div>

      <div className="toggle-row">
        <label style={{ flex: 1 }}>Enabled</label>
        <button
          className={`toggle ${data.enabled ? 'active' : ''}`}
          onClick={() => onChange({ enabled: !data.enabled })}
        />
      </div>
    </>
  );
}
