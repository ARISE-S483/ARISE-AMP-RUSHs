import { toast } from 'sonner';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const IDB_KEYS = [
  'melodies_favorites',
  'melodies_recent',
  'melodies_playlists',
];

const LS_KEYS = [
  'melodies_settings',
  'melodies_lastfm',
  'melodies-theme-store',
];

export interface LibraryExport {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Export all library data as a JSON file download */
export async function exportLibrary(): Promise<void> {
  const data: Record<string, unknown> = {};

  for (const key of LS_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) data[key] = JSON.parse(value);
    } catch { /* skip unparseable */ }
  }

  for (const key of IDB_KEYS) {
    try {
      const value = await idbGet(key);
      if (value) data[key] = value;
    } catch { /* skip */ }
  }

  const exportData: LibraryExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `melodies-library-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  toast.success('Library exported successfully');
}

/** Import library data from a JSON file, merging with existing */
export function importLibrary(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string) as LibraryExport;

        if (!parsed.version || !parsed.data) {
          toast.error('Invalid library file format');
          reject(new Error('Invalid format'));
          return;
        }

        for (const [key, value] of Object.entries(parsed.data)) {
          if (LS_KEYS.includes(key)) {
            try {
              localStorage.setItem(key, JSON.stringify(value));
            } catch { /* */ }
          } else if (IDB_KEYS.includes(key)) {
            try {
              const existing = await idbGet(key);
              if (existing && Array.isArray(existing) && Array.isArray(value)) {
                const existingArr = existing as Record<string, unknown>[];
                const newArr = value as Record<string, unknown>[];
                const existingIds = new Set(existingArr.map(i => String(i.id)));
                const merged = [...existingArr, ...newArr.filter(i => !existingIds.has(String(i.id)))];
                await idbSet(key, merged);
              } else {
                await idbSet(key, value);
              }
            } catch {
              await idbSet(key, value);
            }
          }
        }

        toast.success(`Library imported. Please reload the application to apply changes.`);
        resolve();
      } catch {
        toast.error('Failed to parse library file');
        reject(new Error('Parse error'));
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file');
      reject(new Error('Read error'));
    };

    reader.readAsText(file);
  });
}
