import { useState } from 'react';
import { X, Plus, ChevronDown, ChevronRight, FolderSearch } from 'lucide-react';
import type { BashNodeData } from '../types';
import { pickFolder } from '../lib/tauri';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';

interface Props {
  data: BashNodeData;
  onChange: (data: Partial<BashNodeData>) => void;
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="config-section-heading"
    >
      {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="config-label-row">
      <label className="config-label">{children}</label>
      {hint && <span className="config-hint">{hint}</span>}
    </div>
  );
}

export function BashConfig({ data, onChange }: Props) {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [scriptOpen, setScriptOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [envOpen, setEnvOpen] = useState(false);

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

  const envCount = Object.keys(data.env).length;

  return (
    <>
      <section className="config-section">
        <SectionHeader label="Script" open={scriptOpen} onToggle={() => setScriptOpen(!scriptOpen)} />
        {scriptOpen && (
          <div className="config-section-content">
            <div className="config-field">
              <FieldLabel hint="Use {{input}} for upstream data">Command</FieldLabel>
              <Textarea
                value={data.script}
                onChange={e => onChange({ script: e.target.value })}
                placeholder={"echo 'hello world'"}
                className="config-script-area"
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Settings" open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />
        {settingsOpen && (
          <div className="config-section-content">
            <div className="config-field">
              <FieldLabel>Shell</FieldLabel>
              <Select value={data.shell} onChange={e => onChange({ shell: e.target.value as BashNodeData['shell'] })}>
                <option value="bash">bash</option>
                <option value="sh">sh</option>
                <option value="zsh">zsh</option>
              </Select>
            </div>

            <div className="config-field">
              <FieldLabel>Working Directory</FieldLabel>
              <div className="config-input-with-action">
                <Input
                  value={data.workingDirectory}
                  onChange={e => onChange({ workingDirectory: e.target.value })}
                  placeholder="Uses flow workspace when empty"
                />
                <Button type="button" variant="outline" size="sm" onClick={async () => {
                  const folder = await pickFolder();
                  if (folder) onChange({ workingDirectory: folder });
                }}>
                  <FolderSearch className="w-3.5 h-3.5" />
                  Browse
                </Button>
              </div>
            </div>

            <div className="config-field">
              <FieldLabel hint="0 = none">Timeout (ms)</FieldLabel>
              <Input
                type="number"
                value={data.timeoutMs}
                onChange={e => onChange({ timeoutMs: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="config-switch-group">
              <div className="config-switch-row">
                <span>Enabled</span>
                <Switch
                  checked={data.enabled}
                  onCheckedChange={v => onChange({ enabled: v })}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader
          label={`Environment${envCount > 0 ? ` (${envCount})` : ''}`}
          open={envOpen}
          onToggle={() => setEnvOpen(!envOpen)}
        />
        {envOpen && (
          <div className="config-section-content">
            <div className="env-list">
              {Object.entries(data.env).map(([k, v]) => (
                <div key={k} className="env-row">
                  <code className="env-key">{k}</code>
                  <span className="env-equals">=</span>
                  <code className="env-value">{v}</code>
                  <button
                    type="button"
                    onClick={() => removeEnv(k)}
                    className="env-remove"
                    aria-label={`Remove ${k}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="env-add-row">
              <Input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="KEY"
                className="font-mono text-[11px]"
              />
              <Input
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                placeholder="value"
                className="font-mono text-[11px]"
              />
              <Button variant="outline" size="sm" onClick={addEnv}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
