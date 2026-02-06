import type { ClaudeCodeNodeData } from '../types';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';

interface Props {
  data: ClaudeCodeNodeData;
  onChange: (data: Partial<ClaudeCodeNodeData>) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
      {children}
    </label>
  );
}

export function ClaudeCodeConfig({ data, onChange }: Props) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Prompt</FieldLabel>
        <Textarea
          value={data.prompt}
          onChange={e => onChange({ prompt: e.target.value })}
          placeholder="Enter prompt... Use {{input}} for upstream data"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Model</FieldLabel>
        <Select value={data.model} onChange={e => onChange({ model: e.target.value as ClaudeCodeNodeData['model'] })}>
          <option value="sonnet">Sonnet</option>
          <option value="opus">Opus</option>
          <option value="haiku">Haiku</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Output Format</FieldLabel>
        <Select value={data.outputFormat} onChange={e => onChange({ outputFormat: e.target.value as ClaudeCodeNodeData['outputFormat'] })}>
          <option value="json">JSON</option>
          <option value="stream-json">Stream JSON</option>
          <option value="text">Text</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Permission Mode</FieldLabel>
        <Select value={data.permissionMode} onChange={e => onChange({ permissionMode: e.target.value as ClaudeCodeNodeData['permissionMode'] })}>
          <option value="default">Default</option>
          <option value="plan">Plan</option>
          <option value="bypassPermissions">Bypass Permissions</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Allowed Tools</FieldLabel>
        <Input
          value={data.allowedTools.join(', ')}
          onChange={e => onChange({ allowedTools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          placeholder="Read, Bash, Write..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>System Prompt (appended)</FieldLabel>
        <Textarea
          value={data.appendSystemPrompt}
          onChange={e => onChange({ appendSystemPrompt: e.target.value })}
          placeholder="Additional instructions..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Max Budget (USD)</FieldLabel>
        <Input
          type="number"
          value={data.maxBudgetUsd}
          onChange={e => onChange({ maxBudgetUsd: parseFloat(e.target.value) || 0 })}
          min={0}
          step={0.1}
        />
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

      <div className="flex items-center justify-between py-1">
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Continue Session</span>
        <Switch
          checked={data.continueSession}
          onCheckedChange={v => onChange({ continueSession: v })}
        />
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
