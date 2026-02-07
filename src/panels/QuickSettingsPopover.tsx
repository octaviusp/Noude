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
    <>
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
    </>
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
    <>
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
    </>
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
          <div>
            <h3 className="quick-settings-title">Quick Settings</h3>
            <p className="quick-settings-subtitle">{data.nodeType.replace('-', ' ')} node</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuickSettings(null);
              setNodeSettingsSheetNodeId(node.id);
              selectNode(node.id);
            }}
          >
            Advanced
          </Button>
        </header>

        <div className="quick-settings-body">
          <label className="quick-settings-field">
            <span className="quick-settings-label">Label</span>
            <Input
              value={data.label}
              onChange={(event) => onChange({ label: event.target.value })}
            />
          </label>

          {data.nodeType === 'claude-code' && (
            <ClaudeQuickSettings data={data} onChange={onChange} />
          )}
          {data.nodeType === 'bash' && (
            <BashQuickSettings data={data} onChange={onChange} />
          )}

          <div className="quick-settings-switch">
            <span className="quick-settings-label">Enabled</span>
            <Switch
              checked={data.enabled}
              onCheckedChange={(value) => onChange({ enabled: value })}
            />
          </div>
        </div>
      </section>
    </>
  );
}
