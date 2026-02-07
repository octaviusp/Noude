import { Sparkles, Terminal, ChevronRight } from 'lucide-react';
import type { AnyNodeData, BashNodeData, ClaudeCodeNodeData } from '../types';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Button } from '../components/ui/button';

const POP_WIDTH = 340;
const POP_HEIGHT = 360;

function clampPosition(x: number, y: number) {
  if (typeof window === 'undefined') return { left: x, top: y };
  return {
    left: Math.max(12, Math.min(x, window.innerWidth - POP_WIDTH - 12)),
    top: Math.max(12, Math.min(y, window.innerHeight - POP_HEIGHT - 12)),
  };
}

function ClaudeQuickSettings({
  data,
  onChange,
}: {
  data: ClaudeCodeNodeData;
  onChange: (partial: Partial<AnyNodeData>) => void;
}) {
  return (
    <div className="quick-settings-section">
      <label className="quick-settings-field">
        <span className="quick-settings-label">Prompt</span>
        <Textarea
          value={data.prompt}
          onChange={(event) => onChange({ prompt: event.target.value })}
          className="quick-settings-textarea"
          placeholder="Describe what this node should do..."
        />
      </label>
      <label className="quick-settings-field">
        <span className="quick-settings-label">Model</span>
        <Input
          value={data.model}
          onChange={(event) => onChange({ model: event.target.value })}
        />
      </label>
      <label className="quick-settings-field">
        <span className="quick-settings-label">Output Format</span>
        <Select
          value={data.outputFormat}
          onChange={(event) => onChange({ outputFormat: event.target.value as ClaudeCodeNodeData['outputFormat'] })}
        >
          <option value="stream-json">Stream JSON</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </Select>
      </label>
    </div>
  );
}

function BashQuickSettings({
  data,
  onChange,
}: {
  data: BashNodeData;
  onChange: (partial: Partial<AnyNodeData>) => void;
}) {
  return (
    <div className="quick-settings-section">
      <label className="quick-settings-field">
        <span className="quick-settings-label">Command</span>
        <Textarea
          value={data.script}
          onChange={(event) => onChange({ script: event.target.value })}
          className="quick-settings-textarea"
          placeholder="echo hello world"
        />
      </label>
      <label className="quick-settings-field">
        <span className="quick-settings-label">Shell</span>
        <Select
          value={data.shell}
          onChange={(event) => onChange({ shell: event.target.value as BashNodeData['shell'] })}
        >
          <option value="bash">bash</option>
          <option value="sh">sh</option>
          <option value="zsh">zsh</option>
        </Select>
      </label>
    </div>
  );
}

export function QuickSettingsPopover() {
  const quickSettings = useUiStore(s => s.quickSettings);
  const setQuickSettings = useUiStore(s => s.setQuickSettings);
  const setNodeSettingsSheetNodeId = useUiStore(s => s.setNodeSettingsSheetNodeId);
  const getNode = useFlowStore(s => s.getNode);
  const updateNodeData = useFlowStore(s => s.updateNodeData);
  const selectNode = useFlowStore(s => s.selectNode);

  if (!quickSettings) return null;

  const node = getNode(quickSettings.nodeId);
  if (!node) return null;

  const data = node.data as AnyNodeData;
  const onChange = (partial: Partial<AnyNodeData>) => updateNodeData(node.id, partial);
  const position = clampPosition(quickSettings.x, quickSettings.y);

  return (
    <>
      <button
        type="button"
        className="quick-settings-scrim"
        aria-label="Close quick settings"
        onClick={() => setQuickSettings(null)}
      />
      <section
        className="quick-settings-popover"
        style={{ left: position.left, top: position.top }}
        aria-label="Quick node settings"
      >
        <header className="quick-settings-header">
          <div className="quick-settings-header-left">
            <div className={`quick-settings-header-icon ${data.nodeType === 'claude-code' ? 'is-claude' : 'is-bash'}`}>
              {data.nodeType === 'claude-code' ? <Sparkles className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
            </div>
            <span className="quick-settings-header-label">{data.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="quick-settings-advanced-btn"
            onClick={() => {
              setQuickSettings(null);
              setNodeSettingsSheetNodeId(node.id);
              selectNode(node.id);
            }}
          >
            Advanced
            <ChevronRight className="w-3 h-3" />
          </Button>
        </header>

        <div className="quick-settings-body">
          <div className="quick-settings-section">
            <label className="quick-settings-field">
              <span className="quick-settings-label">Label</span>
              <Input value={data.label} onChange={(event) => onChange({ label: event.target.value })} />
            </label>
          </div>

          {data.nodeType === 'claude-code' && (
            <ClaudeQuickSettings data={data} onChange={onChange} />
          )}
          {data.nodeType === 'bash' && (
            <BashQuickSettings data={data} onChange={onChange} />
          )}

          <div className="quick-settings-section">
            <div className="quick-settings-switch">
              <span className="quick-settings-label">Enabled</span>
              <Switch checked={data.enabled} onCheckedChange={(value) => onChange({ enabled: value })} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
