import { useState } from 'react';
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import type { BashNodeData } from '../types';
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
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left py-0 cursor-pointer bg-transparent border-none"
    >
      {open
        ? <ChevronDown className="w-3 h-3 text-slate-500" />
        : <ChevronRight className="w-3 h-3 text-slate-500" />
      }
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px]">
        {label}
      </span>
    </button>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-slate-400">
        {children}
      </label>
      {hint && (
        <span className="text-[10px] text-slate-600">{hint}</span>
      )}
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
      {/* Script Section */}
      <div className="px-5 py-4 border-b border-[#1e293b]/60">
        <SectionHeader label="Script" open={scriptOpen} onToggle={() => setScriptOpen(!scriptOpen)} />
        {scriptOpen && (
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Use {{input}} for upstream data">Command</FieldLabel>
              <Textarea
                value={data.script}
                onChange={e => onChange({ script: e.target.value })}
                placeholder={"echo 'hello world'"}
                className="min-h-[160px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="px-5 py-4 border-b border-[#1e293b]/60">
        <SectionHeader label="Settings" open={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />
        {settingsOpen && (
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Shell</FieldLabel>
              <Select value={data.shell} onChange={e => onChange({ shell: e.target.value as BashNodeData['shell'] })}>
                <option value="bash">bash</option>
                <option value="sh">sh</option>
                <option value="zsh">zsh</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel>Working Directory</FieldLabel>
              <Input
                value={data.workingDirectory}
                onChange={e => onChange({ workingDirectory: e.target.value })}
                placeholder="/path/to/project"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="0 = none">Timeout (ms)</FieldLabel>
              <Input
                type="number"
                value={data.timeoutMs}
                onChange={e => onChange({ timeoutMs: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="border-t border-[#1e293b]/60 pt-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] font-medium text-slate-400">Enabled</span>
                <Switch
                  checked={data.enabled}
                  onCheckedChange={v => onChange({ enabled: v })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Environment Variables Section */}
      <div className="px-5 py-4 border-b border-[#1e293b]/60">
        <SectionHeader
          label={`Environment${envCount > 0 ? ` (${envCount})` : ''}`}
          open={envOpen}
          onToggle={() => setEnvOpen(!envOpen)}
        />
        {envOpen && (
          <div className="flex flex-col gap-2 mt-3">
            {Object.entries(data.env).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs bg-[#0d1117] rounded-md px-2.5 py-1.5">
                <code className="text-indigo-400 flex-1 truncate font-mono text-[11px]">{k}</code>
                <span className="text-slate-600">=</span>
                <code className="text-slate-400 flex-[2] truncate font-mono text-[11px]">{v}</code>
                <button
                  onClick={() => removeEnv(k)}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all duration-150 cursor-pointer bg-transparent border-none shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex gap-1.5">
              <Input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="KEY"
                className="flex-1 font-mono text-[11px]"
              />
              <Input
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                placeholder="value"
                className="flex-[2] font-mono text-[11px]"
              />
              <Button variant="outline" size="sm" onClick={addEnv} className="shrink-0">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
