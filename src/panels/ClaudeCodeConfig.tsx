import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ClaudeCodeNodeData } from '../types';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';

interface Props {
  data: ClaudeCodeNodeData;
  onChange: (data: Partial<ClaudeCodeNodeData>) => void;
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

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="config-switch-row">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function ClaudeCodeConfig({ data, onChange }: Props) {
  const [promptOpen, setPromptOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <section className="config-section">
        <SectionHeader label="Prompt" open={promptOpen} onToggle={() => setPromptOpen(!promptOpen)} />
        {promptOpen && (
          <div className="config-section-content">
            <div className="config-field">
              <FieldLabel hint="Use {{input}} for upstream data">Main Prompt</FieldLabel>
              <Textarea
                value={data.prompt}
                onChange={e => onChange({ prompt: e.target.value })}
                placeholder="Enter prompt..."
              />
            </div>

            <div className="config-field">
              <FieldLabel>System Prompt (appended)</FieldLabel>
              <Textarea
                value={data.appendSystemPrompt}
                onChange={e => onChange({ appendSystemPrompt: e.target.value })}
                placeholder="Additional instructions..."
                className="config-textarea-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Model & Execution" open={modelOpen} onToggle={() => setModelOpen(!modelOpen)} />
        {modelOpen && (
          <div className="config-section-content">
            <div className="config-field">
              <FieldLabel>Model</FieldLabel>
              <Select value={data.model} onChange={e => onChange({ model: e.target.value as ClaudeCodeNodeData['model'] })}>
                <option value="sonnet">Sonnet 4.5</option>
                <option value="opus">Opus 4.6</option>
                <option value="haiku">Haiku 4.5</option>
              </Select>
            </div>

            <div className="config-field">
              <FieldLabel>Output Format</FieldLabel>
              <Select value={data.outputFormat} onChange={e => onChange({ outputFormat: e.target.value as ClaudeCodeNodeData['outputFormat'] })}>
                <option value="json">JSON</option>
                <option value="stream-json">Stream JSON</option>
                <option value="text">Text</option>
              </Select>
            </div>

            <div className="config-field">
              <FieldLabel>Permission Mode</FieldLabel>
              <Select value={data.permissionMode} onChange={e => onChange({ permissionMode: e.target.value as ClaudeCodeNodeData['permissionMode'] })}>
                <option value="bypassPermissions">Bypass Permissions</option>
                <option value="dontAsk">Don't Ask</option>
                <option value="acceptEdits">Accept Edits</option>
                <option value="plan">Plan</option>
                <option value="default">Default</option>
                <option value="delegate">Delegate</option>
              </Select>
            </div>

            <div className="config-field">
              <FieldLabel>Allowed Tools</FieldLabel>
              <Input
                value={data.allowedTools.join(', ')}
                onChange={e => onChange({ allowedTools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Read, Bash, Write..."
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Advanced" open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)} />
        {advancedOpen && (
          <div className="config-section-content">
            <div className="config-grid-two">
              <div className="config-field">
                <FieldLabel hint="USD">Max Budget</FieldLabel>
                <Input
                  type="number"
                  value={data.maxBudgetUsd}
                  onChange={e => onChange({ maxBudgetUsd: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                />
              </div>

              <div className="config-field">
                <FieldLabel hint="0 = unlimited">Max Turns</FieldLabel>
                <Input
                  type="number"
                  value={data.maxTurns}
                  onChange={e => onChange({ maxTurns: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="config-field">
              <FieldLabel>Working Directory</FieldLabel>
              <Input
                value={data.workingDirectory}
                onChange={e => onChange({ workingDirectory: e.target.value })}
                placeholder="/path/to/project"
              />
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
              <SwitchRow
                label="Continue Session"
                checked={data.continueSession}
                onChange={v => onChange({ continueSession: v })}
              />
              <SwitchRow
                label="Enabled"
                checked={data.enabled}
                onChange={v => onChange({ enabled: v })}
              />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
