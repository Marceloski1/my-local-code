import { useState, useEffect } from 'react';
import { AgentClient, OllamaModelInfo } from '@agent/sdk';
import { useAppStore } from '../store/app-store.js';

const client = new AgentClient();

export function useModels() {
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState({ completed: 0, total: 100 });
  const setActiveModel = useAppStore(state => state.setModel);
  const setServerConnected = useAppStore(state => state.setServerConnected);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = () => {
    setLoading(true);
    client
      .listModels()
      .then((m: OllamaModelInfo[]) => {
        setModels(m);
        setServerConnected(true);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setServerConnected(false);
      })
      .finally(() => setLoading(false));

    client
      .getActiveModel()
      .then((m: string | null) => m && setActiveModel(m))
      .catch(() => {});
  };

  const pullModel = async (name: string) => {
    setPulling(true);
    setPullProgress({ completed: 0, total: 100 });
    try {
      for await (const progress of client.pullModel(name)) {
        if (progress.status === 'success') {
          break;
        }
        if (progress.total && progress.completed) {
          setPullProgress({ completed: progress.completed, total: progress.total });
        }
      }
      fetchModels();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPulling(false);
    }
  };

  const selectModel = async (name: string) => {
    try {
      await client.setActiveModel(name);
      setActiveModel(name);
      setError(null); // Clear any previous errors
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      // Check if it's a model not found error
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        setError(`Modelo ${name} no encontrado. Descárgalo primero con 'ollama pull ${name}'`);
      } else {
        setError(errorMessage);
      }
    }
  };

  return { models, loading, error, pulling, pullProgress, pullModel, selectModel, fetchModels };
}
