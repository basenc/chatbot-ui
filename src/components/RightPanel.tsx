"use client";

import { useState, useEffect, useCallback } from 'react';
// card components removed — not used in this panel
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
// cn utility not used in this file
import { toast } from 'sonner';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: { id: string; name?: string }[];
  placeholder: string;
}

function ModelSelector({ value, onChange, open, onOpenChange, models, placeholder }: ModelSelectorProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 min-w-0 text-left"
        >
          <span className="block w-full min-w-0 truncate">
            {value
              ? models.find((m) => m.id === value)?.name ?? models.find((m) => m.id === value)?.id ?? value
              : placeholder}
          </span>
          <ChevronsUpDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {models.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    onOpenChange(false)
                  }}
                >
                  <span className="flex-1 truncate">{m.name ?? m.id}</span>
                  {value === m.id ? <Check className="ml-2" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function RightPanel() {
  const [apiBase, setApiBase] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [taskModel, setTaskModel] = useState('');
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  // models returned from /api/models may include a `name` property for display.
  // We store the array items with `id` (value used for selection) and optional `name`.
  const [models, setModels] = useState<{ id: string; name?: string; object?: string }[]>([]);

  const fetchModels = useCallback(() => {
    if (apiKey && apiBase) {
      fetch('/api/models')
        .then((res) => res.json())
        .then((data) => {
          // Normalize the model objects to ensure { id, name? }
          if (Array.isArray(data)) {
            const normalized = data.map((m: unknown) => {
              if (m && typeof m === 'object') {
                const mm = m as Record<string, unknown>;
                const idVal = mm.id ?? mm.model ?? mm.name ?? '';
                const id = String(idVal ?? '');
                const nameVal = mm.name ?? mm.id ?? mm.model;
                const name = nameVal == null ? undefined : String(nameVal);
                return { id, name };
              }
              return { id: '', name: undefined };
            }).filter((x) => x.id);
            setModels(normalized);
          } else {
            setModels([]);
          }
        })
        .catch((_err) => {
          console.error('Failed to fetch models', _err);
          setModels([]);
        });
    } else {
      setModels([]);
    }
  }, [apiKey, apiBase]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        setApiBase(settings.openai_api_base || '');
        setApiKey(settings.openai_api_key || '');
        setModel(settings.openai_model || '');
        setTaskModel(settings.openai_task_model || '');
      })
      .catch(err => console.error('Failed to fetch settings', err));
  }, []);

  useEffect(() => {
    if (apiKey && apiBase) {
      // eslint-disable-next-line
      fetchModels();
    }
  }, [apiKey, apiBase, fetchModels]);

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai_api_base: apiBase,
          openai_api_key: apiKey,
          openai_model: model,
          openai_task_model: taskModel
        })
      });
      if (response.ok) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch {
      toast.error('Failed to save settings.');
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <Label htmlFor="api-base">API Base</Label>
      <Input
        id="api-base"
        value={apiBase}
        onChange={(e) => setApiBase(e.target.value)}
        onBlur={fetchModels}
        placeholder="https://api.openai.com/v1"
      />
      <Label htmlFor="api-key">API Key</Label>
      <Input
        id="api-key"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        onBlur={fetchModels}
        placeholder="sk-..."
      />
      <Label htmlFor="model">Model</Label>
      <div className="flex flex-row gap-2">
        <ModelSelector
          value={model}
          onChange={setModel}
          open={open}
          onOpenChange={setOpen}
          models={models}
          placeholder="Select model..."
        />
        <Button variant="outline" onClick={fetchModels} className="w-min h-min">
          <RefreshCw />
        </Button>
      </div>
      <Label htmlFor="task-model">Task Model</Label>
      <div className="flex flex-row gap-2">
        <ModelSelector
          value={taskModel}
          onChange={setTaskModel}
          open={taskOpen}
          onOpenChange={setTaskOpen}
          models={models}
          placeholder="Select task model..."
        />
        <Button variant="outline" onClick={fetchModels} className="w-min h-min">
          <RefreshCw />
        </Button>
      </div>
      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
};