import type { CodexNodeData } from '../types';

interface Props {
  data: CodexNodeData;
  onChange: (data: Partial<CodexNodeData>) => void;
}

export function CodexConfig({ data, onChange }: Props) {
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
        <input
          value={data.model}
          onChange={e => onChange({ model: e.target.value })}
          placeholder="o3, gpt-4.1, etc."
        />
      </label>

      <label>
        Sandbox Mode
        <select
          value={data.sandboxMode}
          onChange={e => onChange({ sandboxMode: e.target.value as CodexNodeData['sandboxMode'] })}
        >
          <option value="read-only">Read Only</option>
          <option value="workspace-write">Workspace Write</option>
          <option value="danger-full-access">Full Access</option>
        </select>
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
        <label style={{ flex: 1 }}>Full Auto</label>
        <button
          className={`toggle ${data.fullAuto ? 'active' : ''}`}
          onClick={() => onChange({ fullAuto: !data.fullAuto })}
        />
      </div>

      <div className="toggle-row">
        <label style={{ flex: 1 }}>JSON Output</label>
        <button
          className={`toggle ${data.jsonOutput ? 'active' : ''}`}
          onClick={() => onChange({ jsonOutput: !data.jsonOutput })}
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
