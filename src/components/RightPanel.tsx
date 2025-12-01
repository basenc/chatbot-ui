"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { getOAIModelsList } from '@/lib/utils';
import { settingsCache, Setting } from '@/lib/odm';
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";

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
  const [apiBase, setApiBase] = useState(() => {
    const setting = settingsCache.get("openai_api_base");
    return typeof setting?.value === 'string' ? setting.value : '';
  });
  const [apiKey, setApiKey] = useState(() => {
    const setting = settingsCache.get("openai_api_key");
    return typeof setting?.value === 'string' ? setting.value : '';
  });
  const [model, setModel] = useState(() => {
    const setting = settingsCache.get("openai_model");
    return typeof setting?.value === 'string' ? setting.value : '';
  });
  const [taskModel, setTaskModel] = useState(() => {
    const setting = settingsCache.get("openai_task_model");
    return typeof setting?.value === 'string' ? setting.value : '';
  });
  const [open, setOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [models, setModels] = useState<{ id: string; name?: string; object?: string }[]>([]);
  const initializedRef = useRef(false);

  const saveSetting = useCallback(async (key: string, value: string) => {
    const setting = settingsCache.get(key);
    if (setting) {
      await setting.update({ value });
    } else {
      new Setting(key, value);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    if (apiKey && apiBase) {
      try {
        const modelsList = await getOAIModelsList();
        const normalized = modelsList.data.map(m => ({ id: m.id, name: m.id }));
        setModels(normalized);
      } catch (err) {
        console.error('Failed to fetch models', err);
        setModels([]);
      }
    } else {
      setModels([]);
    }
  }, [apiKey, apiBase]);

  useEffect(() => {
    if (!initializedRef.current && apiKey && apiBase) {
      initializedRef.current = true;
      const controller = new AbortController();
      getOAIModelsList().then(modelsList => {
        if (!controller.signal.aborted) {
          setModels(modelsList.data.map(m => ({ id: m.id, name: m.id })));
        }
      }).catch(err => {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch models', err);
          setModels([]);
        }
      });
      return () => controller.abort();
    }
  }, [apiKey, apiBase]);

  const handleApiBaseChange = (value: string) => {
    setApiBase(value);
  };

  const handleApiBaseSave = () => {
    saveSetting("openai_api_base", apiBase);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  const handleApiKeySave = () => {
    saveSetting("openai_api_key", apiKey);
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    saveSetting("openai_model", value);
  };

  const handleTaskModelChange = (value: string) => {
    setTaskModel(value);
    saveSetting("openai_task_model", value);
  };

  return (
    <SidebarProvider open={true}>
      <Sidebar collapsible="none" className="w-full min-h-screen max-h-screen" side="right">
        <SidebarHeader>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2 p-2">
              <Label htmlFor="api-base">API Base</Label>
              <Input
                id="api-base"
                value={apiBase}
                onChange={(e) => handleApiBaseChange(e.target.value)}
                onBlur={handleApiBaseSave}
                placeholder="https://api.openai.com/v1"
              />
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                onBlur={handleApiKeySave}
                placeholder="sk-..."
              />
              <Label htmlFor="model">Model</Label>
              <div className="flex flex-row gap-2">
                <ModelSelector
                  value={model}
                  onChange={handleModelChange}
                  open={open}
                  onOpenChange={setOpen}
                  models={models}
                  placeholder="Select model..."
                />
                <Button variant="outline" size="icon" onClick={fetchModels}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Label htmlFor="task-model">Task Model</Label>
              <div className="flex flex-row gap-2">
                <ModelSelector
                  value={taskModel}
                  onChange={handleTaskModelChange}
                  open={taskOpen}
                  onOpenChange={setTaskOpen}
                  models={models}
                  placeholder="Select task model..."
                />
                <Button variant="outline" size="icon" onClick={fetchModels}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </SidebarProvider>
  );
};