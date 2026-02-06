import { useState } from 'react';
import type { BashNodeData } from '../types';

interface Props {
  data: BashNodeData;
  onChange: (data: Partial<BashNodeData>) => void;
}

export function BashConfig({ data, onChange }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const addEnv = () => {
    if (!newKey.trim()) return;
    onChange({ env: { ...data.env, [newKey.trim()]: newVal } });
    setNewKey('');
    setNewVal('');
  };

  const removeEnv = (key: string) => {
    const next = { ...data.env };
    delete next[key];
    onChange({ env: next });
  };

  return (
    <>
      <label>
        Script
        <textarea
          value={data.script}
          onChange={e => onChange({ script: e.target.value })}
          placeholder="echo 'hello world'&#10;# Use {{input}} for upstream data"
          style={{ minHeight: '160px' }}
        />
      </label>

      <label>
        Shell
        <select value={data.shell} onChange={e => onChange({ shell: e.target.value as BashNodeData['shell'] })}>
          <option value="bash">bash</option>
          <option value="sh">sh</option>
          <option value="zsh">zsh</option>
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

      <label>Environment Variables</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Object.entries(data.env).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' }}>
            <code style={{ color: 'var(--accent-bash)', flex: 1 }}>{k}</code>
            <span style={{ color: 'var(--text-muted)' }}>=</span>
            <code style={{ color: 'var(--text-secondary)', flex: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</code>
            <button
              onClick={() => removeEnv(k)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-error)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="KEY"
            style={{ flex: 1 }}
          />
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            placeholder="value"
            style={{ flex: 2 }}
          />
          <button
            onClick={addEnv}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            +
          </button>
        </div>
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
