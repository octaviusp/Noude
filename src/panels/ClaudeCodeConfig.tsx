import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderSearch } from 'lucide-react';
import type { ClaudeCodeNodeData } from '../types';
import { pickFolder } from '../lib/tauri';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';

interface Props {
  data: ClaudeCodeNodeData;
  onChange: (data: Partial<ClaudeCodeNodeData>) => void;
}

const MODEL_PRESETS = [
  {
    value: 'opus',
    title: 'Opus Latest',
    description: 'Most capable alias (auto-updates to latest Opus).',
  },
  {
    value: 'sonnet',
    title: 'Sonnet Latest',
    description: 'Balanced alias for most coding tasks.',
  },
  {
    value: 'haiku',
    title: 'Haiku Latest',
    description: 'Fastest alias for lightweight tasks.',
  },
] as const;

const MODEL_SUGGESTIONS = [
  'default',
  'sonnet',
  'opus',
  'haiku',
  'sonnet[1m]',
  'opusplan',
  'claude-opus-4-6',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
] as const;

const OUTPUT_FORMAT_HINTS: Record<ClaudeCodeNodeData['outputFormat'], string> = {
  'stream-json': 'Best for live timeline logs. Noude auto-adds --verbose for compatibility.',
  json: 'Returns a single JSON result object when execution completes.',
  text: 'Returns plain text only. Use when you do not need structured events.',
};

const PERMISSION_MODE_OPTIONS: Array<{ value: ClaudeCodeNodeData['permissionMode']; label: string; hint: string }> = [
  { value: 'bypassPermissions', label: 'Bypass Permissions', hint: 'Runs with --dangerously-skip-permissions.' },
  { value: 'dontAsk', label: "Don't Ask", hint: 'Auto-proceeds with tools without approval prompts.' },
  { value: 'acceptEdits', label: 'Accept Edits', hint: 'Auto-accepts file edits while keeping command prompts.' },
  { value: 'plan', label: 'Plan', hint: 'Planning-first behavior before execution.' },
  { value: 'default', label: 'Default', hint: 'Uses Claude Code default permission behavior.' },
  { value: 'delegate', label: 'Delegate', hint: 'Delegates permission decisions to configured policy.' },
];

function parseDelimitedList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinDelimitedList(values: string[]): string {
  return values.join(', ');
}

function normalizeModelAlias(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const key = trimmed.toLowerCase().replace(/\s+/g, '-');
  if (key === 'sonnet-latest' || key === 'latest-sonnet' || key === 'claude-sonnet-latest') return 'sonnet';
  if (key === 'opus-latest' || key === 'latest-opus' || key === 'claude-opus-latest') return 'opus';
  if (key === 'haiku-latest' || key === 'latest-haiku' || key === 'claude-haiku-latest') return 'haiku';
  return trimmed;
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

function FieldNote({ children }: { children: React.ReactNode }) {
  return <p className="config-field-note">{children}</p>;
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
  const [runtimeOpen, setRuntimeOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [structuredOpen, setStructuredOpen] = useState(
    data.outputFormat === 'json' || Boolean(data.jsonSchema?.trim())
  );

  const permissionHint = useMemo(() => {
    return PERMISSION_MODE_OPTIONS.find((opt) => opt.value === data.permissionMode)?.hint
      ?? 'Uses Claude Code permission handling.';
  }, [data.permissionMode]);

  const pickWorkingDirectory = async () => {
    const folder = await pickFolder();
    if (folder) onChange({ workingDirectory: folder });
  };

  return (
    <>
      <section className="config-section">
        <SectionHeader label="Prompt" open={promptOpen} onToggle={() => setPromptOpen(!promptOpen)} />
        {promptOpen && (
          <div className="config-section-content">
            <p className="config-section-description">
              Write the task for this agent. Use <code>{'{{input}}'}</code> to place upstream node output exactly where you want it.
            </p>

            <div className="config-field">
              <FieldLabel>Main Prompt</FieldLabel>
              <Textarea
                value={data.prompt}
                onChange={e => onChange({ prompt: e.target.value })}
                placeholder="Describe exactly what this Claude node should do..."
              />
            </div>

            <div className="config-field">
              <FieldLabel hint="appended after Noude system context">System Prompt</FieldLabel>
              <Textarea
                value={data.appendSystemPrompt}
                onChange={e => onChange({ appendSystemPrompt: e.target.value })}
                placeholder="Additional constraints, style, or safety instructions..."
                className="config-textarea-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Runtime" open={runtimeOpen} onToggle={() => setRuntimeOpen(!runtimeOpen)} />
        {runtimeOpen && (
          <div className="config-section-content">
            <p className="config-section-description">
              These fields map directly to Claude Code CLI flags for this node instance.
            </p>

            <div className="config-field">
              <FieldLabel hint="aliases auto-track latest releases">Model</FieldLabel>
              <div className="config-model-presets">
                {MODEL_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={[
                      'config-model-preset',
                      data.model === preset.value ? 'is-active' : '',
                    ].join(' ').trim()}
                    onClick={() => onChange({ model: preset.value })}
                  >
                    <span className="config-model-preset-title">{preset.title}</span>
                    <span className="config-model-preset-desc">{preset.description}</span>
                  </button>
                ))}
              </div>
              <Input
                value={data.model}
                onChange={e => onChange({ model: normalizeModelAlias(e.target.value) })}
                placeholder="sonnet"
                list="claude-model-options"
              />
              <datalist id="claude-model-options">
                {MODEL_SUGGESTIONS.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <FieldNote>
                Tip: use <code>sonnet</code>, <code>opus</code>, or <code>haiku</code> for automatic latest selection.
              </FieldNote>
            </div>

            <div className="config-field">
              <FieldLabel>Output Format</FieldLabel>
              <Select
                value={data.outputFormat}
                onChange={e => onChange({ outputFormat: e.target.value as ClaudeCodeNodeData['outputFormat'] })}
              >
                <option value="stream-json">Stream JSON</option>
                <option value="json">JSON</option>
                <option value="text">Text</option>
              </Select>
              <FieldNote>{OUTPUT_FORMAT_HINTS[data.outputFormat]}</FieldNote>
            </div>

            <div className="config-field">
              <FieldLabel>Permission Mode</FieldLabel>
              <Select
                value={data.permissionMode}
                onChange={e => onChange({ permissionMode: e.target.value as ClaudeCodeNodeData['permissionMode'] })}
              >
                {PERMISSION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
              <FieldNote>{permissionHint}</FieldNote>
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Tools & Workspace" open={toolsOpen} onToggle={() => setToolsOpen(!toolsOpen)} />
        {toolsOpen && (
          <div className="config-section-content">
            <div className="config-field">
              <FieldLabel hint="comma or new line separated">Allowed Tools</FieldLabel>
              <Input
                value={joinDelimitedList(data.allowedTools)}
                onChange={e => onChange({ allowedTools: parseDelimitedList(e.target.value) })}
                placeholder="Read, Glob, Grep, Bash(git:*)"
              />
            </div>

            <div className="config-field">
              <FieldLabel hint="comma or new line separated">Disallowed Tools</FieldLabel>
              <Input
                value={joinDelimitedList(data.disallowedTools)}
                onChange={e => onChange({ disallowedTools: parseDelimitedList(e.target.value) })}
                placeholder="Write, Edit"
              />
            </div>

            <div className="config-field">
              <FieldLabel>Working Directory</FieldLabel>
              <div className="config-input-with-action">
                <Input
                  value={data.workingDirectory}
                  onChange={e => onChange({ workingDirectory: e.target.value })}
                  placeholder="Uses flow workspace when empty"
                />
                <Button type="button" variant="outline" size="sm" onClick={pickWorkingDirectory}>
                  <FolderSearch className="w-3.5 h-3.5" />
                  Browse
                </Button>
              </div>
            </div>

            <div className="config-field">
              <FieldLabel hint="each line becomes --add-dir">Additional Dirs</FieldLabel>
              <Textarea
                value={data.additionalDirs.join('\n')}
                onChange={e => onChange({ additionalDirs: parseDelimitedList(e.target.value) })}
                placeholder="/path/to/shared/context\n/path/to/another/project"
                className="config-textarea-sm"
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Limits & Session" open={limitsOpen} onToggle={() => setLimitsOpen(!limitsOpen)} />
        {limitsOpen && (
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
                  onChange={e => onChange({ maxTurns: parseInt(e.target.value, 10) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="config-field">
              <FieldLabel hint="0 = none">Timeout (ms)</FieldLabel>
              <Input
                type="number"
                value={data.timeoutMs}
                onChange={e => onChange({ timeoutMs: parseInt(e.target.value, 10) || 0 })}
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
                label="Node Enabled"
                checked={data.enabled}
                onChange={v => onChange({ enabled: v })}
              />
            </div>
          </div>
        )}
      </section>

      <section className="config-section">
        <SectionHeader label="Structured Output" open={structuredOpen} onToggle={() => setStructuredOpen(!structuredOpen)} />
        {structuredOpen && (
          <div className="config-section-content">
            <p className="config-section-description">
              JSON Schema validation is most useful with <strong>Output Format = JSON</strong>.
            </p>
            <div className="config-field">
              <FieldLabel hint="optional">JSON Schema</FieldLabel>
              <Textarea
                value={data.jsonSchema ?? ''}
                onChange={e => onChange({ jsonSchema: e.target.value || undefined })}
                placeholder='{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}'
                className="config-textarea-sm"
              />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
