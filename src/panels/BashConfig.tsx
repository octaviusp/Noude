import { useState } from 'react';
import { X, Plus } from 'lucide-react';
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
      {children}
    </label>
  );
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
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Script</FieldLabel>
        <Textarea
          value={data.script}
          onChange={e => onChange({ script: e.target.value })}
          placeholder={"echo 'hello world'\n# Use {{input}} for upstream data"}
          className="min-h-[160px]"
        />
      </div>

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
        <FieldLabel>Timeout (ms, 0 = none)</FieldLabel>
        <Input
          type="number"
          value={data.timeoutMs}
          onChange={e => onChange({ timeoutMs: parseInt(e.target.value) || 0 })}
          min={0}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Environment Variables</FieldLabel>
        <div className="flex flex-col gap-1.5">
          {Object.entries(data.env).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs">
              <code className="text-indigo-400 flex-1 truncate">{k}</code>
              <span className="text-slate-600">=</span>
              <code className="text-slate-400 flex-[2] truncate">{v}</code>
              <button
                onClick={() => removeEnv(k)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer bg-transparent border-none shrink-0"
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
              className="flex-1"
            />
            <Input
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              placeholder="value"
              className="flex-[2]"
            />
            <Button variant="outline" size="sm" onClick={addEnv} className="shrink-0">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between py-1">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Enabled</span>
        <Switch
          checked={data.enabled}
          onCheckedChange={v => onChange({ enabled: v })}
        />
      </div>
    </>
  );
}
